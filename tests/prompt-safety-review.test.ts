import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptSafetyEngine } from '../src/services/promptSafetyEngine';
import { ScenePackageData, ContinuityBible } from '../src/types/hud';

// Test 1: Fictional character prompt without prominent-person likeness remains substantially unchanged
test('1. Fictional character prompt containing no prominent-person likeness remains substantially unchanged', () => {
  const originalPrompt = 'Cinematic 9:16 vertical composition. An original fictional deep-space astrobiologist in an insulated teal pressure suit collecting frozen methane ice cores on Titan. Slow tracking motion with soft ambient Saturnian ring-light reflections.';
  const narration = 'Atmospheric telemetry confirms dense hydrocarbons suspended above the surface.';
  
  const result = PromptSafetyEngine.reviewPrompt(originalPrompt, narration, {
    contentMode: 'scifi_explainer',
    format: '9:16 vertical',
    visualStyleId: 'cinematic',
  });

  assert.equal(result.status, 'clean', 'Prompt with fictional characters must be classified as clean');
  assert.equal(result.flags.length, 0, 'No likeness flags should be detected');
  assert.equal(result.isRevised, false, 'Clean prompt must not be revised');
  assert.equal(result.revisedVisualPrompt, undefined, 'No revised prompt should be returned for clean prompt');
});

// Test 2: A prompt explicitly requesting an exact recognizable prominent-person likeness is flagged and safely revised
test('2. Prompt explicitly requesting exact recognizable prominent-person likeness is flagged and safely revised', () => {
  const originalPrompt = 'Cinematic 9:16 vertical composition. Extreme close-up portrait of Elon Musk looking up at the Starship rocket launchpad at Starbase Boca Chica, dramatic sunset rim lighting.';
  const narration = 'Next-generation orbital spacecraft are designed for rapid multi-planetary reusability.';

  const result = PromptSafetyEngine.reviewPrompt(originalPrompt, narration, {
    contentMode: 'scifi_explainer',
    format: '9:16 vertical',
    visualStyleId: 'cinematic',
  });

  assert.equal(result.status, 'revised', 'Prompt with real prominent person must be flagged and revised');
  assert.equal(result.isRevised, true, 'isRevised flag must be true');
  assert.ok(result.flags.some(f => f.type === 'prominent_person_name'), 'Should identify prominent_person_name flag');
  
  const revised = result.revisedVisualPrompt || '';
  assert.ok(!revised.toLowerCase().includes('elon musk'), 'Revised prompt must not contain prominent figure name');
  assert.ok(result.fictionalCharacterProfile !== undefined, 'Must provide an original fictional character profile');
  assert.ok(revised.includes(result.fictionalCharacterProfile!.appearance), 'Must inject distinct original facial features and appearance');
  assert.ok(revised.includes('Starship rocket launchpad'), 'Scene environment context and actions must be preserved');
  assert.ok(revised.includes('dramatic sunset rim lighting'), 'Camera and lighting instructions must be preserved');
});

// Test 3: Removing a person's name while retaining the same recognizable likeness (proxy likeness) does not pass review
test('3. Removing a person\'s name while retaining recognizable likeness (proxy likeness) does not pass review', () => {
  // Deliberately omits "Albert Einstein", but describes the iconic recognizable features and sweater
  const proxyPrompt = 'Cinematic 9:16 vertical composition. A wild-haired elderly physicist with an iconic bushy white mustache in a grey wool sweater standing in front of a chalkboard filled with relativity tensor equations.';
  const narration = 'The curvature of spacetime dictates the gravitational geodesic path of matter.';

  const result = PromptSafetyEngine.reviewPrompt(proxyPrompt, narration, {
    contentMode: 'scifi_explainer',
    format: '9:16 vertical',
    visualStyleId: 'cinematic',
  });

  assert.equal(result.status, 'revised', 'Proxy likeness without direct name must still be caught and revised');
  assert.ok(result.flags.some(f => f.type === 'proxy_description'), 'Must identify proxy_description flag');
  
  const revised = result.revisedVisualPrompt || '';
  assert.ok(!revised.includes('iconic bushy white mustache'), 'Iconic proxy likeness must be replaced with original fictional features');
  assert.ok(result.fictionalCharacterProfile !== undefined, 'Must replace proxy with original fictional character spec');
});

// Test 4: Factual documentary context is not automatically removed just because a real person's name appears
test('4. Factual documentary context is not automatically removed just because a real person\'s name appears in narration', () => {
  // Visual prompt is archival / environmental (not generating a synthetic face)
  const archivalVisualPrompt = 'Cinematic archival documentary framing. Detailed macro tracking shot across 1905 Swiss patent office ledger books, handwritten mathematical manuscripts, and brass fountain pens. Warm dust motes floating through afternoon window sunlight.';
  // Narration mentions Albert Einstein as factual historical record
  const factualNarration = 'In 1905, Albert Einstein submitted four groundbreaking papers to the Annalen der Physik, revolutionizing modern physics.';

  const result = PromptSafetyEngine.reviewPrompt(archivalVisualPrompt, factualNarration, {
    contentMode: 'documentary',
    format: '16:9 horizontal',
    visualStyleId: 'cinematic',
  });

  assert.equal(result.status, 'clean', 'Archival documentary visual prompt with factual name in narration must NOT be rejected');
  assert.equal(result.flags.length, 0, 'No flags should be generated for legitimate archival visual prompts');
  assert.equal(result.isRevised, false, 'Archival prompt must remain unchanged');
  assert.ok(factualNarration.includes('Albert Einstein'), 'Factual narration remains intact');
});

// Test 5: Style regeneration and scene regeneration cannot bypass the safety review
test('5. Style regeneration and scene regeneration cannot bypass the safety review', () => {
  const initialScenes: ScenePackageData[] = [
    {
      id: 'scene_01',
      sceneNumber: 1,
      title: 'THE DISCOVERY',
      format: '9:16 vertical',
      durationSec: 8,
      scriptBeat: 'Ground observers detected unexpected anomalies.',
      narration: 'Ground observers detected unexpected anomalies.',
      // Prompt includes likeness directive:
      visualPrompt: 'Cinematic 9:16 composition. Tech executive looking exactly like Sam Altman speaking on stage.',
      continuitySnippet: 'Style: Cinematic; Camera: Orbit.',
      soundDesign: 'Low ambient tone.',
      visualStyleId: 'cinematic',
      isCustomEdited: false,
      scriptVersionReference: 1,
    }
  ];

  const reviewed = PromptSafetyEngine.reviewAndRepairScenePackages(initialScenes, {
    contentMode: 'scifi_explainer',
    visualStyleId: 'retro_anime_90s',
  });

  assert.equal(reviewed.length, 1, 'Scene count must be preserved');
  assert.equal(reviewed[0].safetyReview?.status, 'revised', 'Must be revised during batch/style processing');
  assert.ok(!reviewed[0].visualPrompt.includes('Sam Altman'), 'Likeness request must be stripped and replaced with safe fictional character');
  assert.ok(!reviewed[0].visualPrompt.includes('looking exactly like'), 'Likeness directive must be stripped');
  assert.equal(reviewed[0].narration, initialScenes[0].narration, 'Narration must be byte-for-byte preserved');
});

// Test 6: Narration, approved script, scene duration, scene count, and unrelated manual edits remain unchanged
test('6. Narration, approved script, scene duration, scene count, and unrelated manual edits remain unchanged', () => {
  const customSoundDesign = 'Unique hand-crafted modular analog synth sound design cue.';
  const initialScenes: ScenePackageData[] = [
    {
      id: 'sc_1',
      sceneNumber: 1,
      title: 'SCENE 01 — HOOK',
      format: '9:16 vertical',
      durationSec: 8,
      scriptBeat: 'Immutable approved beat narration text 01.',
      narration: 'Immutable approved beat narration text 01.',
      visualPrompt: 'Close up of a scientist looking like Taylor Swift in laboratory.',
      continuitySnippet: 'Style: Cinematic',
      soundDesign: customSoundDesign,
      visualStyleId: 'cinematic',
      isCustomEdited: true, // Manual edit on soundDesign
      scriptVersionReference: 2,
    },
    {
      id: 'sc_2',
      sceneNumber: 2,
      title: 'SCENE 02 — CLIMAX',
      format: '9:16 vertical',
      durationSec: 8,
      scriptBeat: 'Immutable approved beat narration text 02.',
      narration: 'Immutable approved beat narration text 02.',
      visualPrompt: 'Wide shot of radio telescope dish at dawn with morning fog.',
      continuitySnippet: 'Style: Cinematic',
      soundDesign: 'Sub-bass drone.',
      visualStyleId: 'cinematic',
      isCustomEdited: false,
      scriptVersionReference: 2,
    }
  ];

  const reviewed = PromptSafetyEngine.reviewAndRepairScenePackages(initialScenes, {
    contentMode: 'scifi_explainer',
  });

  assert.equal(reviewed.length, 2, 'Scene count must be exactly preserved');
  assert.equal(reviewed[0].durationSec, 8, 'Scene 1 duration must remain unchanged');
  assert.equal(reviewed[1].durationSec, 8, 'Scene 2 duration must remain unchanged');
  assert.equal(reviewed[0].scriptBeat, 'Immutable approved beat narration text 01.', 'Script beat 1 must be byte-for-byte preserved');
  assert.equal(reviewed[0].narration, 'Immutable approved beat narration text 01.', 'Narration 1 must be byte-for-byte preserved');
  assert.equal(reviewed[1].scriptBeat, 'Immutable approved beat narration text 02.', 'Script beat 2 must be byte-for-byte preserved');
  assert.equal(reviewed[1].narration, 'Immutable approved beat narration text 02.', 'Narration 2 must be byte-for-byte preserved');
  assert.equal(reviewed[0].soundDesign, customSoundDesign, 'Unrelated manual edit to sound design must be strictly preserved');
});

// Test 7: Unrepairable prompts receive a clear warning instead of a fake success
test('7. Unrepairable prompts receive a clear warning instead of a fake success', () => {
  // An unconfirmed or illicit depiction of a real public figure in a documentary context cannot be safely fictionalized
  const unrepairablePrompt = 'Documentary news recreation. Close-up of Joe Biden crying hysterically and being arrested in handcuffs in the Oval Office.';
  const narration = 'Unverified internet rumors spread regarding internal executive branch decisions.';

  const result = PromptSafetyEngine.reviewPrompt(unrepairablePrompt, narration, {
    contentMode: 'documentary',
    format: '16:9 horizontal',
  });

  assert.equal(result.status, 'unrepairable', 'Extreme unverified personal conduct of real figures must be classified as unrepairable');
  assert.equal(result.isRevised, false, 'Must not report fake success or false rewrite');
  assert.ok(result.explanation !== undefined, 'Must provide an explicit explanatory reason');
  assert.ok(result.explanation!.includes('UNREPAIRABLE'), 'Explanation must state it is unrepairable');
  assert.ok(result.suggestedAction !== undefined, 'Must provide actionable guidance for editorial review');
});

// Test 8: Original prompts remain recoverable
test('8. Original prompts remain recoverable and user can inspect revisions', () => {
  const originalPrompt = 'Cinematic 9:16 vertical composition. Portrait of Mark Zuckerberg wearing a Meta hoodie inside an empty server room.';
  const narration = 'Infrastructure engineers scaled distributed cluster networks worldwide.';

  const initialScene: ScenePackageData = {
    id: 'sc_recoverable',
    sceneNumber: 1,
    title: 'SERVER MATRIX',
    format: '9:16 vertical',
    durationSec: 8,
    scriptBeat: narration,
    narration,
    visualPrompt: originalPrompt,
    continuitySnippet: 'Style: Cinematic',
    soundDesign: 'Fan hum.',
    visualStyleId: 'cinematic',
    isCustomEdited: false,
    scriptVersionReference: 1,
  };

  const [repairedScene] = PromptSafetyEngine.reviewAndRepairScenePackages([initialScene], {
    contentMode: 'scifi_explainer',
  });

  // Check that originalVisualPrompt was safely recorded
  assert.equal(repairedScene.originalVisualPrompt, originalPrompt, 'Original visual prompt must be stored as baseline');
  assert.notEqual(repairedScene.visualPrompt, originalPrompt, 'Active visual prompt should now be the revised version');
  assert.equal(repairedScene.safetyReview?.isRevised, true, 'Safety review must indicate it is revised');

  // Verify recovery: User can restore original prompt
  const restoredScene: ScenePackageData = {
    ...repairedScene,
    visualPrompt: repairedScene.originalVisualPrompt!,
    isCustomEdited: true,
  };

  assert.equal(restoredScene.visualPrompt, originalPrompt, 'User must be able to restore the exact original prompt text');
});
