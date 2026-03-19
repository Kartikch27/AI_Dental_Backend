"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TocVisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TocVisionService = void 0;
const common_1 = require("@nestjs/common");
let TocVisionService = TocVisionService_1 = class TocVisionService {
    logger = new common_1.Logger(TocVisionService_1.name);
    model = 'meta-llama/llama-4-scout-17b-16e-instruct';
    get isAvailable() {
        return !!process.env.GROQ_API_KEY;
    }
    async extractToc(pageImages) {
        if (!process.env.GROQ_API_KEY) {
            this.logger.warn('GROQ_API_KEY not set — ToC Vision extraction unavailable');
            return null;
        }
        if (pageImages.length === 0) {
            this.logger.warn('No ToC page images provided');
            return null;
        }
        this.logger.log(`Sending ${pageImages.length} ToC page(s) to Groq Vision (${this.model})...`);
        const imageBlocks = pageImages.map(({ base64 }) => ({
            type: 'image_url',
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
            const data = (await response.json());
            const raw = data.choices[0]?.message?.content ?? '';
            const jsonStr = raw.replace(/```json?\s*/gi, '').replace(/```\s*$/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            parsed.allChapters = parsed.sections.flatMap((s) => s.chapters.map((c) => ({ ...c, sectionTitle: s.title })));
            parsed.allChapters.sort((a, b) => a.number - b.number);
            this.logger.log(`Groq Vision extracted ${parsed.allChapters.length} chapters across ${parsed.sections.length} sections`);
            return parsed;
        }
        catch (err) {
            this.logger.error(`Groq Vision ToC extraction failed: ${err.message}`);
            return null;
        }
    }
};
exports.TocVisionService = TocVisionService;
exports.TocVisionService = TocVisionService = TocVisionService_1 = __decorate([
    (0, common_1.Injectable)()
], TocVisionService);
//# sourceMappingURL=toc-vision.service.js.map