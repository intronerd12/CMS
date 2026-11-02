/**
 * PPTX Parser & Slide Extractor
 * Extracts ordered slides, titles, subtitles, bullet points, speaker notes,
 * and embedded slide pictures/diagrams from PowerPoint .pptx presentations.
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const THEMES = ['indigo', 'blue', 'slate', 'teal', 'emerald', 'amber', 'purple'];

/**
 * Clean XML text escapes and whitespace
 */
function cleanXmlText(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
}

/**
 * Parse a PPTX file buffer or filepath
 * @param {string|Buffer} source File path or Buffer of .pptx
 * @param {object} options Output directory, fallback title, etc.
 * @returns {Array<object>} Array of structured slide objects
 */
function extractPptxSlides(source, options = {}) {
    const { outputDir, publicUrlPrefix, isServerless = false } = options;

    let zip;
    try {
        zip = new AdmZip(source);
    } catch (err) {
        console.error('[PPTX Parser] Failed to read ZIP archive:', err.message);
        return [];
    }

    const entries = zip.getEntries();
    if (!entries || entries.length === 0) return [];

    // 1. Resolve ordered slides from presentation.xml.rels and presentation.xml
    let slideEntryNames = [];
    try {
        const presXml = zip.readAsText('ppt/presentation.xml');
        const presRelsXml = zip.readAsText('ppt/_rels/presentation.xml.rels');
        if (presXml && presRelsXml) {
            const relMap = {};
            const relRegex = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g;
            let m;
            while ((m = relRegex.exec(presRelsXml)) !== null) {
                relMap[m[1]] = m[2];
            }
            const sldIdRegex = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
            while ((m = sldIdRegex.exec(presXml)) !== null) {
                const target = relMap[m[1]];
                if (target) {
                    let norm = target;
                    if (!norm.startsWith('ppt/')) {
                        norm = path.posix.normalize('ppt/' + norm.replace(/^\.\.\//, ''));
                    }
                    slideEntryNames.push(norm);
                }
            }
        }
    } catch (e) {
        // Continue to fallback
    }

    // Fallback: search all ppt/slides/slide{N}.xml
    if (slideEntryNames.length === 0) {
        slideEntryNames = entries
            .map(e => e.entryName)
            .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
            .sort((a, b) => {
                const numA = parseInt((a.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
                const numB = parseInt((b.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
                return numA - numB;
            });
    }

    if (slideEntryNames.length === 0) {
        return [];
    }

    const slides = [];
    const deckSlug = options.deckSlug || `deck_${Date.now()}`;

    // Target folder on disk for extracted slide images (if outputDir provided)
    let diskSlideDir = null;
    if (outputDir && !isServerless) {
        diskSlideDir = path.join(outputDir, deckSlug);
        try {
            if (!fs.existsSync(diskSlideDir)) {
                fs.mkdirSync(diskSlideDir, { recursive: true });
            }
        } catch (e) {
            diskSlideDir = null;
        }
    }

    for (let i = 0; i < slideEntryNames.length; i++) {
        const slideName = slideEntryNames[i];
        let slideXml = '';
        try {
            slideXml = zip.readAsText(slideName);
        } catch (e) {
            continue;
        }
        if (!slideXml) continue;

        // Slide relationships
        const relsName = slideName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        let relsXml = '';
        try {
            relsXml = zip.readAsText(relsName) || '';
        } catch (e) {}

        const relsMap = {};
        const relRegex = /<Relationship\b[^>]*\bId="([^"]+)"(?:[^>]*\bType="([^"]+)")?[^>]*\bTarget="([^"]+)"/g;
        let rm;
        while ((rm = relRegex.exec(relsXml)) !== null) {
            relsMap[rm[1]] = { type: rm[2] || '', target: rm[3] };
        }

        // Speaker notes
        let slideNotes = '';
        const notesRel = Object.values(relsMap).find(r => r.type.includes('notesSlide') || r.target.includes('notesSlide'));
        if (notesRel) {
            let notesPath = notesRel.target;
            if (!notesPath.startsWith('ppt/')) {
                notesPath = path.posix.normalize('ppt/slides/' + notesPath);
            }
            try {
                const notesXml = zip.readAsText(notesPath);
                if (notesXml) {
                    const noteTexts = [];
                    const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
                    let pm;
                    while ((pm = pRegex.exec(notesXml)) !== null) {
                        const tMatches = [...pm[1].matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)].map(t => cleanXmlText(t[1]));
                        const pText = tMatches.join('').trim();
                        if (pText && !/^\d+$/.test(pText) && !/^header/i.test(pText)) {
                            noteTexts.push(pText);
                        }
                    }
                    slideNotes = noteTexts.join('\n\n');
                }
            } catch (e) {}
        }

        // Find Slide Image (e.g. SlideShare deck, slide pictures, diagram)
        let slideImageUrl = null;
        let slideImageRelId = null;

        // Check <p:pic> in slide XML
        const picRegex = /<p:pic\b[\s\S]*?<a:blip\b[^>]*\br:embed="([^"]+)"[\s\S]*?<\/p:pic>/g;
        let picMatch;
        while ((picMatch = picRegex.exec(slideXml)) !== null) {
            const rId = picMatch[1];
            if (relsMap[rId]) {
                slideImageRelId = rId;
                break;
            }
        }

        // Fallback: any blip r:embed
        if (!slideImageRelId) {
            const blipMatch = /<a:blip\b[^>]*\br:embed="([^"]+)"/i.exec(slideXml);
            if (blipMatch && relsMap[blipMatch[1]]) {
                slideImageRelId = blipMatch[1];
            }
        }

        if (slideImageRelId && relsMap[slideImageRelId]) {
            let imgTarget = relsMap[slideImageRelId].target;
            let imgPath = imgTarget;
            if (!imgPath.startsWith('ppt/')) {
                imgPath = path.posix.normalize('ppt/slides/' + imgTarget);
            }
            const imgEntry = zip.getEntry(imgPath);
            if (imgEntry) {
                const ext = path.extname(imgPath).toLowerCase() || '.webp';
                const mimeType = ext === '.webp' ? 'image/webp' : (ext === '.png' ? 'image/png' : (ext === '.gif' ? 'image/gif' : (ext === '.svg' ? 'image/svg+xml' : 'image/jpeg')));
                const imgBuffer = imgEntry.getData();

                // Save to disk if available
                if (diskSlideDir && publicUrlPrefix) {
                    const slideImgFilename = `slide-${String(i + 1).padStart(2, '0')}${ext}`;
                    const diskPath = path.join(diskSlideDir, slideImgFilename);
                    try {
                        fs.writeFileSync(diskPath, imgBuffer);
                        slideImageUrl = `${publicUrlPrefix}/${deckSlug}/${slideImgFilename}`;
                    } catch (e) {
                        slideImageUrl = `data:${mimeType};base64,${imgBuffer.toString('base64')}`;
                    }
                } else {
                    slideImageUrl = `data:${mimeType};base64,${imgBuffer.toString('base64')}`;
                }
            }
        }

        // Extract shapes (title, subtitle, body bullets)
        let slideTitle = '';
        let slideSubtitle = '';
        const bodyParagraphs = [];

        const spRegex = /<p:sp\b[\s\S]*?<\/p:sp>/g;
        let spMatch;
        let isFirstShape = true;

        while ((spMatch = spRegex.exec(slideXml)) !== null) {
            const shapeXml = spMatch[0];
            const isTitleShape = /<p:ph\b[^>]*\btype="(?:ctrTitle|title)"/i.test(shapeXml);
            const isSubtitleShape = /<p:ph\b[^>]*\btype="subTitle"/i.test(shapeXml);

            // Extract all paragraphs in shape
            const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
            let pm;
            const shapeParagraphs = [];
            while ((pm = pRegex.exec(shapeXml)) !== null) {
                const tMatches = [...pm[1].matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)].map(t => cleanXmlText(t[1]));
                const pText = tMatches.join('').trim();
                // Avoid capturing slide number fields or footer strings as bullets
                if (pText && !/^\d+$/.test(pText) && !/^footer$/i.test(pText)) {
                    shapeParagraphs.push(pText);
                }
            }

            if (shapeParagraphs.length === 0) continue;

            if (isTitleShape) {
                slideTitle = shapeParagraphs.join(' ');
            } else if (isSubtitleShape) {
                slideSubtitle = shapeParagraphs.join(' ');
            } else if (!slideTitle && isFirstShape && shapeParagraphs.length === 1 && shapeParagraphs[0].length < 120) {
                slideTitle = shapeParagraphs[0];
            } else {
                bodyParagraphs.push(...shapeParagraphs);
            }
            isFirstShape = false;
        }

        const slideNum = i + 1;
        const theme = THEMES[i % THEMES.length];
        const hasBullets = bodyParagraphs.length > 0;
        const hasImage = !!slideImageUrl;

        let layout = 'bullets';
        if (hasImage && !hasBullets) {
            layout = 'image';
        } else if (hasImage && hasBullets) {
            layout = 'split';
        } else if (!hasBullets && slideSubtitle) {
            layout = 'title';
        }

        slides.push({
            slideNumber: slideNum,
            title: slideTitle || (hasImage ? `Slide ${slideNum}` : `Lesson Slide ${slideNum}`),
            subtitle: slideSubtitle || '',
            layout,
            theme,
            bullets: bodyParagraphs,
            notes: slideNotes || '',
            imageUrl: slideImageUrl || null
        });
    }

    return slides;
}

module.exports = {
    extractPptxSlides
};

