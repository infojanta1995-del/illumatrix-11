/**
 * ILLUMATRIX Google Flow Prompt Safety & Prominent-Person Review Engine
 * 
 * Enforces Google Generative AI and Google Flow policies against synthetic depiction
 * of recognizable prominent living persons, public figures, and deceptive deepfakes.
 * 
 * Design Principles:
 * 1. Contextual review, not mindless keyword blacklisting. Factual narration is strictly preserved.
 * 2. Original fictional characters with distinct, original facial features, hairstyle, and wardrobe.
 * 3. Never merely strip a name while keeping the iconic recognizable likeness (proxy likeness).
 * 4. In documentaries/news, never replace a real person with a fake fictional person masquerading as them;
 *    instead shift visual prompts to archival artifacts, telemetry, setting, hardware, or B-roll,
 *    or flag as unrepairable for explicit user review if safe alternative is impossible.
 * 5. Project-level character continuity across scenes.
 * 6. Never claim "Google Flow approved" or "guaranteed safe".
 * 7. Never use tricks or obfuscation intended to circumvent moderation.
 */

import { 
  ScenePackageData, 
  ContinuityBible, 
  PromptSafetyReview, 
  SafetyIssueFlag, 
  FictionalCharacterSpec 
} from '../types/hud';

// Common known prominent figures / public figures (political, tech executives, celebrities, iconic public personas)
// Note: Used for contextual detection; presence in narration is ALLOWED as factual context.
export const PROMINENT_FIGURE_PATTERNS = [
  // Tech & Business Leaders
  /\b(elon\s+musk|musk)\b/i,
  /\b(sam\s+altman|altman)\b/i,
  /\b(mark\s+zuckerberg|zuckerberg)\b/i,
  /\b(jeff\s+bezos|bezos)\b/i,
  /\b(bill\s+gates)\b/i,
  /\b(steve\s+jobs)\b/i,
  /\b(satya\s+nadella)\b/i,
  /\b(sundar\s+pichai)\b/i,
  /\b(tim\s+cook)\b/i,
  /\b(jensen\s+huang)\b/i,

  // World Leaders & Political Figures
  /\b(joe\s+biden|biden)\b/i,
  /\b(donald\s+trump|trump)\b/i,
  /\b(barack\s+obama|obama)\b/i,
  /\b(kamala\s+harris)\b/i,
  /\b(narendra\s+modi|modi)\b/i,
  /\b(vladimir\s+putin|putin)\b/i,
  /\b(xi\s+jinping)\b/i,
  /\b(emmanuel\s+macron)\b/i,
  /\b(keir\s+starmer)\b/i,
  /\b(rishi\s+sunak)\b/i,

  // Entertainment, Cultural & Celebrity Figures
  /\b(taylor\s+swift)\b/i,
  /\b(beyonc[eé])\b/i,
  /\b(keanu\s+reeves)\b/i,
  /\b(tom\s+cruise)\b/i,
  /\b(leonardo\s+dicaprio)\b/i,
  /\b(cristiano\s+ronaldo|ronaldo)\b/i,
  /\b(lionel\s+messi|messi)\b/i,
  /\b(kanye\s+west|ye)\b/i,
  /\b(drake)\b/i,
  /\b(kim\s+kardashian)\b/i,
  /\b(mrbeast|jimmy\s+donaldson)\b/i,
  /\b(oprah\s+winfrey|oprah)\b/i,

  // Historical / Celebrated Icons commonly targeted for deepfakes
  /\b(albert\s+einstein|einstein)\b/i,
  /\b(marilyn\s+monroe)\b/i,
  /\b(elvis\s+presley)\b/i,
  /\b(michael\s+jackson)\b/i,
  /\b(neil\s+armstrong)\b/i,
  /\b(martin\s+luther\s+king(\s+jr\.?)?)\b/i,
  /\b(winston\s+churchill)\b/i,
  /\b(abraham\s+lincoln)\b/i,
  /\b(queen\s+elizabeth(\s+ii)?)\b/i,
];

// Likeness-request phrasing patterns that signal an intent to recreate someone's face or likeness
export const LIKENESS_DIRECTIVE_PATTERNS = [
  /\b(looks?\s+(?:exactly\s+)?like|looking\s+(?:exactly\s+)?like)\b/i,
  /\b(resembling|in\s+the\s+likeness\s+of|face\s+of|facial\s+likeness\s+of)\b/i,
  /\b(digital\s+clone\s+of|photorealistic\s+likeness\s+of|twin\s+of)\b/i,
  /\b(make\s+(?:him|her|them)\s+look\s+(?:exactly\s+)?like)\b/i,
  /\b(modeled\s+after\s+(?:the\s+face\s+of)?|based\s+on\s+the\s+likeness\s+of)\b/i,
  /\b(exact\s+replica\s+of|young\s+(?:version\s+of)?|aged\s+(?:version\s+of)?)\b/i,
  /\b(deepfake\s+of|synthetic\s+recreation\s+of|impersonating)\b/i,
];

// Proxy Likeness Descriptions: Descriptions that remove the name but deliberately describe iconic,
// unmistakable public figures' recognizable likeness, wardrobe, and setting to produce a surrogate likeness.
export const PROXY_LIKENESS_PATTERNS = [
  {
    regex: /\b(?:wild-haired|eccentric)\s+(?:elderly\s+)?(?:german\s+|swiss\s+)?physicist\s+with\s+(?:an?\s+)?(?:iconic\s+)?bushy\s+white\s+mustache\b/i,
    identity: 'Albert Einstein proxy likeness',
  },
  {
    regex: /\b(?:tech\s+)?billionaire\s+(?:mogul\s+)?with\s+messy\s+(?:dark\s+)?hair\s+(?:wearing\s+|in\s+)(?:an?\s+)?(?:iron\s+man|spacex|tesla)\s+(?:t-?shirt|jacket)\s+at\s+(?:starbase|boca\s+chica|launchpad)\b/i,
    identity: 'Elon Musk proxy likeness',
  },
  {
    regex: /\btech\s+(?:ceo|founder)\s+in\s+(?:a\s+)?black\s+turtleneck(?:\s+and\s+round\s+wire\s+glasses)?\s+pacing\s+on\s+(?:a\s+)?keynote\s+stage\b/i,
    identity: 'Steve Jobs proxy likeness',
  },
  {
    regex: /\bpop\s+(?:superstar|icon)\s+with\s+(?:signature\s+)?blonde\s+bangs\s+and\s+red\s+lipstick\s+in\s+(?:a\s+)?glittery\s+stadium\s+bodysuit\b/i,
    identity: 'Taylor Swift proxy likeness',
  },
  {
    regex: /\belected\s+president\s+giving\s+(?:an?\s+)?oval\s+office\s+address\s+with\s+(?:signature\s+)?aviator\s+sunglasses\b/i,
    identity: 'Joe Biden proxy likeness',
  },
];

// Safe, distinctive fictional character templates with original facial features and wardrobe
const FICTIONAL_ARCHETYPES: Record<string, { role: string; appearance: string; wardrobe: string }> = {
  scifi_researcher: {
    role: 'Lead Deep-Space Astrophysicist',
    appearance: 'An original fictional 40-year-old researcher with sharp angular jawline, close-cropped slate-grey curly hair, distinctive amber-tinted hexagonal wire spectacles, and calm focused expression',
    wardrobe: 'Matte dark-navy technical laboratory coat with bronze magnetic closures over a charcoal ribbed knit base layer',
  },
  tech_engineer: {
    role: 'Systems Chief Engineer',
    appearance: 'An original fictional 35-year-old aerospace engineer with olive complexion, neat side-parted dark espresso hair, observant hazel eyes, and deliberate posture',
    wardrobe: 'Durable graphite flight technician jumpsuit with high-visibility reflective teal cuffs and telemetry chest badge',
  },
  curiosity_explorer: {
    role: 'Field Investigator',
    appearance: 'An original fictional 28-year-old explorer with warm bronze skin, braided auburn hair tied back in a high crown knot, keen dark brown eyes, and determined gaze',
    wardrobe: 'Weather-beaten ochre canvas utility parka with reinforced ballistic nylon shoulder yokes and rugged brass hardware',
  },
  documentary_historian: {
    role: 'Archival Researcher',
    appearance: 'An original fictional 50-year-old archivist with silver-threaded wavy hair, tortoiseshell round reading glasses perched on a prominent bridge, and thoughtful demeanor',
    wardrobe: 'Tailored tweed vest in heathered forest green over a crisp ivory linen shirt with rolled forearms',
  },
  generic_protagonist: {
    role: 'Central Narrative Observer',
    appearance: 'An original fictional character with distinctive high cheekbones, textured short obsidian hair with an asymmetrical fringe, and expressive steel-blue eyes',
    wardrobe: 'Minimalist obsidian weatherproof utility jacket with asymmetrical zip closure and muted gunmetal accents',
  },
};

export interface ReviewContext {
  contentMode?: string;
  sourceTitle?: string;
  sourceText?: string;
  continuityBible?: ContinuityBible;
  format?: string;
  visualStyleId?: string;
}

export class PromptSafetyEngine {
  /**
   * Reviews a visual prompt in context of the scene, script, and project settings.
   * Returns a detailed audit report and a repaired prompt where appropriate.
   */
  static reviewPrompt(
    visualPrompt: string,
    narrationText: string,
    context: ReviewContext = {},
    existingCharacterSpec?: FictionalCharacterSpec
  ): {
    status: PromptSafetyReview['status'];
    flags: SafetyIssueFlag[];
    revisedVisualPrompt?: string;
    isRevised: boolean;
    explanation?: string;
    suggestedAction?: string;
    fictionalCharacterProfile?: PromptSafetyReview['fictionalCharacterProfile'];
    contextualCategory: 'fictional_creative' | 'documentary_news' | 'abstract_scifi';
  } {
    const flags: SafetyIssueFlag[] = [];
    const mode = (context.contentMode || 'scifi_explainer').toLowerCase();
    const isDocumentaryOrNews = mode === 'documentary' || mode === 'breaking_news';
    const contextualCategory = isDocumentaryOrNews 
      ? 'documentary_news' 
      : mode === 'scifi_explainer' 
      ? 'abstract_scifi' 
      : 'fictional_creative';

    const promptLower = visualPrompt.toLowerCase();

    // 1. Check for Prominent People Names in Visual Prompt
    for (const pattern of PROMINENT_FIGURE_PATTERNS) {
      const match = visualPrompt.match(pattern);
      if (match) {
        const entityName = match[0];
        flags.push({
          type: 'prominent_person_name',
          entityOrPhrase: entityName,
          reason: `Direct reference to prominent figure "${entityName}" in visual generation prompt. Google Flow prohibits synthetic likenesses of recognizable public figures.`,
          severity: 'high',
        });
      }
    }

    // 2. Check for Likeness Directives in Visual Prompt
    for (const directive of LIKENESS_DIRECTIVE_PATTERNS) {
      const match = visualPrompt.match(directive);
      if (match) {
        flags.push({
          type: 'likeness_request',
          entityOrPhrase: match[0],
          reason: `Likeness directive ("${match[0]}") detected. Requesting to recreate a real person's likeness violates video generation safety policies.`,
          severity: 'high',
        });
      }
    }

    // 3. Check for Proxy Likeness Descriptions (Name stripped but distinctive likeness preserved)
    for (const proxy of PROXY_LIKENESS_PATTERNS) {
      if (proxy.regex.test(visualPrompt)) {
        flags.push({
          type: 'proxy_description',
          entityOrPhrase: proxy.identity,
          reason: `Proxy likeness description detected (${proxy.identity}). Merely stripping a name while retaining unmistakable recognizable features, signature wardrobe, and setting still triggers prominent-person rejection.`,
          severity: 'high',
        });
      }
    }

    // 4. Check for Inherited Risky Instructions from Continuity Bible
    if (context.continuityBible?.recurringSubjects) {
      for (const pattern of PROMINENT_FIGURE_PATTERNS) {
        const match = context.continuityBible.recurringSubjects.match(pattern);
        if (match) {
          flags.push({
            type: 'risky_inherited_context',
            entityOrPhrase: match[0],
            reason: `Continuity Bible "recurringSubjects" specifies prominent figure "${match[0]}", which would propagate into every downstream scene prompt.`,
            severity: 'high',
          });
          break;
        }
      }
    }

    // If completely clean: Return clean status
    if (flags.length === 0) {
      return {
        status: 'clean',
        flags: [],
        isRevised: false,
        contextualCategory,
        explanation: 'Prompt contains no prominent-person likeness requests or proxy descriptions.',
      };
    }

    // Determine if Unrepairable:
    // When is a prompt unrepairable?
    // - If it's a documentary/breaking news prompt that explicitly insists on deepfaking a real person doing an unverified or illicit act, OR
    // - When visual instructions explicitly request a direct photo-clone of a real person and provide no environmental context, AND context forbids fictionalization.
    const hasUnconfirmedOrExtremeDepiction = 
      /\b(arrested|handcuffed|drunk|assassinated|bribing|confessing to crime|crying hysterically|stealing)\b/i.test(visualPrompt);

    if (isDocumentaryOrNews && hasUnconfirmedOrExtremeDepiction) {
      return {
        status: 'unrepairable',
        flags,
        isRevised: false,
        contextualCategory,
        explanation: 'UNREPAIRABLE: The prompt requests depicting a real public figure in an unverified or sensitive scenario. Automatic fictionalization is prohibited for documentary/news to prevent falsifying facts. Manual editorial review is required.',
        suggestedAction: 'Refocus the visual prompt onto verified archival documents, setting photography, or press conference rostrum without depicting synthetic personal conduct.',
      };
    }

    // PERFORM SAFE AND FAITHFUL REPAIR
    // Case A: Fictional / Creative Story (scifi, explainer, horror, funny)
    // Safe resolution: Replace the likeness / prominent person with a distinct, original fictional character
    // with original facial features, hairstyle, and wardrobe, while preserving all scene actions, environment, camera, and lighting.
    if (!isDocumentaryOrNews) {
      const character = existingCharacterSpec || this.getOrCreateFictionalCharacter(context);
      const repairedPrompt = this.synthesizeFictionalCharacterPrompt(visualPrompt, character);

      // Verify that the repaired prompt itself does not still match proxy patterns
      const secondaryFlags = this.testLikenessResiduals(repairedPrompt);
      if (secondaryFlags.length > 0) {
        return {
          status: 'unrepairable',
          flags: [...flags, ...secondaryFlags],
          isRevised: false,
          contextualCategory,
          explanation: 'Prompt could not be automatically repaired without residual likeness cues. User review required.',
          suggestedAction: 'Manually specify an original fictional subject appearance in the prompt text.',
        };
      }

      return {
        status: 'revised',
        flags,
        revisedVisualPrompt: repairedPrompt,
        isRevised: true,
        contextualCategory,
        fictionalCharacterProfile: {
          role: character.role,
          appearance: character.originalAppearance,
          wardrobe: character.wardrobeAndStyle,
          continuityId: character.id,
        },
        explanation: `Visual prompt safely revised: Replaced prominent-person likeness request with an original fictional character (${character.role}) with distinctive original facial features, hair, and wardrobe to prevent Google Flow prominent-person rejection while strictly preserving scene purpose, camera grammar, and narration.`,
        suggestedAction: 'Review the revised visual prompt. Original prompt is preserved and recoverable at any time.',
      };
    }

    // Case B: Documentary or Breaking News
    // Law: Do NOT replace a real person with a fake fictional person pretending to be that real person!
    // Instead: Shift visual focus to documentary evidence, archival setting, instruments, blueprints, hardware,
    // laboratory workbench, historical documents, or atmospheric over-the-shoulder / silhouette cinematography.
    const documentaryRepairedPrompt = this.synthesizeDocumentaryArchivalPrompt(visualPrompt, narrationText);

    return {
      status: 'revised',
      flags,
      revisedVisualPrompt: documentaryRepairedPrompt,
      isRevised: true,
      contextualCategory,
      explanation: 'Documentary visual prompt safely adapted: Shifted visual composition from synthetic close-up likeness of real individuals to verified archival documents, instruments, and environmental B-roll. Factual narration and historical context are strictly preserved.',
      suggestedAction: 'Review the documentary B-roll visual prompt. Original prompt is preserved and can be restored if needed.',
    };
  }

  /**
   * Evaluates if any likeness directives or prominent figures still remain in a string.
   */
  static testLikenessResiduals(prompt: string): SafetyIssueFlag[] {
    const residuals: SafetyIssueFlag[] = [];
    for (const pat of PROMINENT_FIGURE_PATTERNS) {
      const match = prompt.match(pat);
      if (match) {
        residuals.push({
          type: 'prominent_person_name',
          entityOrPhrase: match[0],
          reason: `Residual prominent figure reference: ${match[0]}`,
          severity: 'high',
        });
      }
    }
    for (const dir of LIKENESS_DIRECTIVE_PATTERNS) {
      const match = prompt.match(dir);
      if (match) {
        residuals.push({
          type: 'likeness_request',
          entityOrPhrase: match[0],
          reason: `Residual likeness directive: ${match[0]}`,
          severity: 'high',
        });
      }
    }
    for (const proxy of PROXY_LIKENESS_PATTERNS) {
      if (proxy.regex.test(prompt)) {
        residuals.push({
          type: 'proxy_description',
          entityOrPhrase: proxy.identity,
          reason: `Residual proxy likeness: ${proxy.identity}`,
          severity: 'high',
        });
      }
    }
    return residuals;
  }

  /**
   * Retrieves an existing fictional character from Continuity Bible or synthesizes a consistent one.
   */
  static getOrCreateFictionalCharacter(context: ReviewContext): FictionalCharacterSpec {
    if (context.continuityBible?.fictionalCharacters && context.continuityBible.fictionalCharacters.length > 0) {
      return context.continuityBible.fictionalCharacters[0];
    }

    const mode = (context.contentMode || '').toLowerCase();
    let archetype = FICTIONAL_ARCHETYPES.scifi_researcher;

    if (mode === 'explainer' || mode === 'detailed_explainer') {
      archetype = FICTIONAL_ARCHETYPES.tech_engineer;
    } else if (mode === 'horror_story') {
      archetype = FICTIONAL_ARCHETYPES.curiosity_explorer;
    } else if (mode === 'documentary') {
      archetype = FICTIONAL_ARCHETYPES.documentary_historian;
    } else {
      archetype = FICTIONAL_ARCHETYPES.generic_protagonist;
    }

    return {
      id: `char_fictional_${Date.now()}`,
      role: archetype.role,
      originalAppearance: archetype.appearance,
      wardrobeAndStyle: archetype.wardrobe,
      notes: 'Safe project-level fictional character with distinctive original features, maintained across all scenes.',
    };
  }

  /**
   * Replaces likeness requests in fictional scenes with an original fictional character.
   */
  static synthesizeFictionalCharacterPrompt(prompt: string, character: FictionalCharacterSpec): string {
    let cleaned = prompt;

    // Remove likeness directives like "looks like [Person]" or "in the likeness of [Person]"
    cleaned = cleaned.replace(/\b(?:make\s+(?:him|her|them)\s+)?(?:look|looking)\s+(?:exactly\s+)?like\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bin\s+the\s+likeness\s+of\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bresembling\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bphotorealistic\s+likeness\s+of\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bdigital\s+clone\s+of\s+[A-Z][a-zA-Z\s.-]+/gi, '');

    // Replace known prominent figure names with the original fictional character description
    for (const pat of PROMINENT_FIGURE_PATTERNS) {
      cleaned = cleaned.replace(pat, 'the researcher');
    }

    // Clean up proxy likeness patterns
    for (const proxy of PROXY_LIKENESS_PATTERNS) {
      cleaned = cleaned.replace(proxy.regex, 'an original fictional researcher with distinct features');
    }

    // Ensure double spaces and awkward punctuation are cleaned up
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

    // Splice in the distinctive original character description at the primary subject position
    // If prompt starts with style header (e.g. "Cinematic 9:16 vertical composition. ...")
    const stylePrefixMatch = cleaned.match(/^([A-Za-z0-9\s:/-]+(?:composition|shot|framing|perspective)\.\s*)/i);
    const charInjection = `${character.originalAppearance}, wearing ${character.wardrobeAndStyle}.`;

    if (stylePrefixMatch) {
      const prefix = stylePrefixMatch[1];
      const rest = cleaned.slice(prefix.length).trim();
      return `${prefix}${charInjection} ${rest}`;
    }

    return `${charInjection} ${cleaned}`;
  }

  /**
   * Replaces prominent likeness requests in documentary/news prompts with authentic archival/environmental visual prompts.
   */
  static synthesizeDocumentaryArchivalPrompt(prompt: string, narration: string): string {
    let cleaned = prompt;

    // Remove direct names
    for (const pat of PROMINENT_FIGURE_PATTERNS) {
      cleaned = cleaned.replace(pat, 'historical records and archival telemetry');
    }

    // Remove likeness directives
    cleaned = cleaned.replace(/\b(?:make\s+(?:him|her|them)\s+)?(?:look|looking)\s+(?:exactly\s+)?like\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bin\s+the\s+likeness\s+of\s+[A-Z][a-zA-Z\s.-]+/gi, '');
    cleaned = cleaned.replace(/\bresembling\s+[A-Z][a-zA-Z\s.-]+/gi, '');

    for (const proxy of PROXY_LIKENESS_PATTERNS) {
      cleaned = cleaned.replace(proxy.regex, 'historical archival artifacts and equipment');
    }

    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

    // Inject documentary focus
    const documentarySubject = 'Cinematic archival documentary framing. Detailed macro view of authentic historical documents, technical manuscripts, laboratory instrumentation, and atmospheric setting artifacts.';
    
    // Check if style prefix exists
    const stylePrefixMatch = cleaned.match(/^([A-Za-z0-9\s:/-]+(?:composition|shot|framing|perspective)\.\s*)/i);
    if (stylePrefixMatch) {
      const prefix = stylePrefixMatch[1];
      const rest = cleaned.slice(prefix.length).trim();
      return `${prefix}${documentarySubject} ${rest}`;
    }

    return `${documentarySubject} ${cleaned}`;
  }

  /**
   * Reviews and repairs an entire array of ScenePackageData objects.
   * Keeps approved script, narration, word count, and duration 100% immutable.
   */
  static reviewAndRepairScenePackages(
    scenes: ScenePackageData[],
    context: ReviewContext = {}
  ): ScenePackageData[] {
    // Generate or fetch a single consistent character spec across the entire batch
    const sharedCharacter = this.getOrCreateFictionalCharacter(context);

    return scenes.map((scene) => {
      // Review prompt
      const reviewResult = this.reviewPrompt(
        scene.visualPrompt,
        scene.narration,
        context,
        sharedCharacter
      );

      const safetyReview: PromptSafetyReview = {
        status: reviewResult.status,
        flags: reviewResult.flags,
        isRevised: reviewResult.isRevised,
        originalVisualPrompt: reviewResult.isRevised ? scene.visualPrompt : (scene.originalVisualPrompt || scene.visualPrompt),
        explanation: reviewResult.explanation,
        suggestedAction: reviewResult.suggestedAction,
        fictionalCharacterProfile: reviewResult.fictionalCharacterProfile,
        contextualCategory: reviewResult.contextualCategory,
        reviewedAt: new Date().toISOString(),
      };

      if (reviewResult.isRevised && reviewResult.revisedVisualPrompt) {
        return {
          ...scene,
          // Store original prompt if not already stored
          originalVisualPrompt: scene.originalVisualPrompt || scene.visualPrompt,
          visualPrompt: reviewResult.revisedVisualPrompt,
          safetyReview,
          // Continuity snippet updated to reference safe character if applicable
          continuitySnippet: reviewResult.fictionalCharacterProfile
            ? `${scene.continuitySnippet}; Subject: Fictional ${reviewResult.fictionalCharacterProfile.role}`
            : scene.continuitySnippet,
          // Invariants: Script beat, narration, duration, format are STRICTLY untouched:
          scriptBeat: scene.scriptBeat,
          narration: scene.narration,
          durationSec: scene.durationSec,
          format: scene.format,
        };
      }

      return {
        ...scene,
        safetyReview,
      };
    });
  }
}
