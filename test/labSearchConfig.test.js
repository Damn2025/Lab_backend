import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLabTypeColumn } from '../src/services/labSearchService.js';

test('resolveLabTypeColumn uses LabType for chemical or bio values and disciplineName otherwise', () => {
  assert.equal(resolveLabTypeColumn('chemical'), 'LabType');
  assert.equal(resolveLabTypeColumn('bio'), 'LabType');
  assert.equal(resolveLabTypeColumn('cosmetics'), 'LabType');
  assert.equal(resolveLabTypeColumn('electrical'), 'disciplineName');
  assert.equal(resolveLabTypeColumn('mechanical'), 'disciplineName');
});
