import { Injectable, Logger } from '@nestjs/common';

export interface TocChapter {
  number: number;
  title: string;
  page: number;
  sectionTitle?: string;
}

export interface TocVisionResult {
  sections: Array<{
    title: string;
    chapters: TocChapter[];
  }>;
  allChapters: TocChapter[]; // flattened, sorted by number
}

/**
 * Uses Groq Vision (meta-llama/llama-4-scout-17b-16e-instruct) to extract a
 * structured Table of Contents from PDF page images.
 * Groq's API is OpenAI-compatible; images are passed as base64 data URLs.
 */
@Injectable()
export class TocVisionService {
  private readonly logger = new Logger(TocVisionService.name);
  private readonly model = 'meta-llama/llama-4-scout-17b-16e-instruct';

  get isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  /**
   * Sends ToC page images to Groq Vision and returns a structured chapter list.
   * @param pageImages  Array of { page, base64 } PNG images of ToC pages
   */
  async extractToc(
    pageImages: Array<{ page: number; base64: string }>,
  ): Promise<TocVisionResult | null> {
    if (!process.env.GROQ_API_KEY) {
      this.logger.warn('GROQ_API_KEY not set — ToC Vision extraction unavailable');
      return null;
    }

    if (pageImages.length === 0) {
      this.logger.warn('No ToC page images provided');
      return null;
    }

    this.logger.log(`Sending ${pageImages.length} ToC page(s) to Groq Vision (${this.model})...`);

    // Build the image content blocks (OpenAI-compatible image_url format)
    const imageBlocks = pageImages.map(({ base64 }) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${base64}`,
      },
    }));

    const prompt = `You are analyzing the Table of Contents pages of a medical/dental textbook.

Extract ALL chapters and sections from these images.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "sections": [
    {
      "title": "Section 1 Introduction & Growth and development",
      "chapters": [
        { "number": 1, "title": "Introduction to Orthodontics", "page": 1 },
        { "number": 2, "title": "Growth and Development - General Principles and Concepts", "page": 9 }
      ]
    },
    {
      "title": "Section 2 Occlusion & Malocclusion",
      "chapters": [
        { "number": 6, "title": "Occlusion - Basic Concepts", "page": 69 }
      ]
    }
  ]
}

Rules:
- If there are no named sections, put everything under one section with title "Main Content"
- chapter number should be an integer
- page should be an integer (the page number shown in the ToC, not the PDF page)
- Include ALL chapters visible in the images
- Do not invent chapters not shown in the image`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: [
                ...imageBlocks,
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${errText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const raw = data.choices[0]?.message?.content ?? '';
      const jsonStr = raw.replace(/```json?\s*/gi, '').replace(/```\s*$/g, '').trim();

      const parsed = JSON.parse(jsonStr) as TocVisionResult;

      parsed.allChapters = parsed.sections.flatMap((s) =>
        s.chapters.map((c) => ({ ...c, sectionTitle: s.title })),
      );
      parsed.allChapters.sort((a, b) => a.number - b.number);

      this.logger.log(
        `Groq Vision extracted ${parsed.allChapters.length} chapters across ${parsed.sections.length} sections`,
      );

      return parsed;
    } catch (err) {
      this.logger.error(`Groq Vision ToC extraction failed: ${(err as Error).message}`);
      return null;
    }
  }
}
