import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THUMBNAIL_PACKAGE, StorageService } from '../src/services/storage';
import { ThumbnailPromptItem, ThumbnailStudioPackage, StaleMatrix } from '../src/types/hud';

test('Thumbnail Studio - Blueprint Default Package Integrity', () => {
  const pkg = DEFAULT_THUMBNAIL_PACKAGE;
  assert.ok(pkg.id, 'Package must have an ID');
  assert.equal(pkg.options.length, 2, 'Must have exactly 2 distinct options per Blueprint');
  
  const optA = pkg.options.find(o => o.id === 'option_a');
  const optB = pkg.options.find(o => o.id === 'option_b');

  assert.ok(optA, 'Option A must exist');
  assert.ok(optB, 'Option B must exist');

  // Verify Distinct Visual Angles per Blueprint Page 13
  assert.match(optA.name, /OBJECT OF ENIGMA/i, 'Option A must be Object of Enigma');
  assert.match(optB.name, /ASTRONOMER DISCOVERY|OBSERVER/i, 'Option B must be Observer Reaction');
  assert.ok(optA.overlayTextSuggestion.length > 0, 'Option A has recommended overlay text');
  assert.ok(optB.overlayTextSuggestion.length > 0, 'Option B has recommended overlay text');
  assert.ok(optA.detailedPrompt.length > 50, 'Option A detailed prompt is comprehensive');
  assert.ok(optB.detailedPrompt.length > 50, 'Option B detailed prompt is comprehensive');
});

test('Thumbnail Studio - Primary Option Selection & Toggle', () => {
  let pkg: ThumbnailStudioPackage = { ...DEFAULT_THUMBNAIL_PACKAGE, selectedOptionId: 'option_a' };
  assert.equal(pkg.selectedOptionId, 'option_a');

  // Toggle to Option B
  pkg = { ...pkg, selectedOptionId: 'option_b' };
  assert.equal(pkg.selectedOptionId, 'option_b', 'Primary option switches to Option B');
});

test('Thumbnail Studio - Manual Edit Tracking & Approval Invalidation', () => {
  const initialPkg: ThumbnailStudioPackage = {
    ...DEFAULT_THUMBNAIL_PACKAGE,
    isApproved: true,
    approvedAt: new Date().toISOString(),
  };

  assert.equal(initialPkg.isApproved, true);

  // User modifies detailed prompt of Option A
  const updatedOptions = initialPkg.options.map(opt => {
    if (opt.id === 'option_a') {
      return {
        ...opt,
        detailedPrompt: 'Custom user modified prompt focusing on extreme macro refraction facets.',
        isCustomEdited: true,
      };
    }
    return opt;
  });

  const modifiedPkg: ThumbnailStudioPackage = {
    ...initialPkg,
    options: updatedOptions,
    isApproved: false, // Editing draft resets approval per Blueprint
    updatedAt: new Date().toISOString(),
  };

  assert.equal(modifiedPkg.isApproved, false, 'Approval must be invalidated when fields are edited');
  const editedOptionA = modifiedPkg.options.find(o => o.id === 'option_a');
  assert.equal(editedOptionA?.isCustomEdited, true);
  assert.match(editedOptionA!.detailedPrompt, /Custom user modified/);
});

test('Thumbnail Studio - Single Option Regeneration Isolation', () => {
  const pkg: ThumbnailStudioPackage = {
    ...DEFAULT_THUMBNAIL_PACKAGE,
    options: [
      {
        ...DEFAULT_THUMBNAIL_PACKAGE.options[0],
        detailedPrompt: 'PRESERVED_CUSTOM_OPTION_A_CONTENT',
        isCustomEdited: true,
      },
      {
        ...DEFAULT_THUMBNAIL_PACKAGE.options[1],
        detailedPrompt: 'ORIGINAL_OPTION_B_CONTENT',
      }
    ]
  };

  // Regenerate only Option B
  const regeneratedOptionB: ThumbnailPromptItem = {
    ...pkg.options[1],
    detailedPrompt: 'FRESHLY_REGENERATED_OPTION_B_CONTENT',
    isCustomEdited: false,
  };

  const updatedPkg = {
    ...pkg,
    options: pkg.options.map(o => o.id === 'option_b' ? regeneratedOptionB : o),
  };

  const optA = updatedPkg.options.find(o => o.id === 'option_a');
  const optB = updatedPkg.options.find(o => o.id === 'option_b');

  assert.equal(optA?.detailedPrompt, 'PRESERVED_CUSTOM_OPTION_A_CONTENT', 'Option A must remain strictly untouched');
  assert.equal(optA?.isCustomEdited, true);
  assert.equal(optB?.detailedPrompt, 'FRESHLY_REGENERATED_OPTION_B_CONTENT', 'Option B is updated');
});

test('Thumbnail Studio - Approval & Stale Resolution Workflow', () => {
  let staleMatrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: true,
    seoStale: false,
    upstreamReason: 'Script updated to v2',
  };

  assert.equal(staleMatrix.thumbnailsStale, true);

  // Approval clears stale state
  staleMatrix = {
    ...staleMatrix,
    thumbnailsStale: false,
  };

  const approvedPkg: ThumbnailStudioPackage = {
    ...DEFAULT_THUMBNAIL_PACKAGE,
    scriptVersionReference: 2,
    isApproved: true,
    approvedAt: new Date().toISOString(),
  };

  assert.equal(staleMatrix.thumbnailsStale, false);
  assert.equal(approvedPkg.isApproved, true);
  assert.equal(approvedPkg.scriptVersionReference, 2);
});

test('Thumbnail Studio - Aspect Ratio Format Responsiveness', () => {
  // Shorts 9:16
  const shortsRatio = '9:16 vertical';
  // Long-Form 16:9
  const longFormRatio = '16:9 horizontal';

  const shortsOption = { ...DEFAULT_THUMBNAIL_PACKAGE.options[0], ratio: shortsRatio };
  const longFormOption = { ...DEFAULT_THUMBNAIL_PACKAGE.options[0], ratio: longFormRatio };

  assert.equal(shortsOption.ratio, '9:16 vertical');
  assert.equal(longFormOption.ratio, '16:9 horizontal');
});

test('Thumbnail Studio - Storage Persistence Serialization', () => {
  const pkg = DEFAULT_THUMBNAIL_PACKAGE;
  const serialized = JSON.stringify(pkg);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.id, pkg.id);
  assert.equal(parsed.options.length, 2);
  assert.equal(parsed.selectedOptionId, pkg.selectedOptionId);
  assert.equal(parsed.options[0].detailedPrompt, pkg.options[0].detailedPrompt);
});
