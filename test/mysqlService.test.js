import test from 'node:test';
import assert from 'node:assert/strict';
import { MysqlQueryBuilder } from '../src/services/mysqlService.js';

test('MysqlQueryBuilder generates a safe SELECT query with filters', async () => {
  const calls = [];
  const pool = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return [[{ id: 1 }], null];
    }
  };

  const builder = new MysqlQueryBuilder(pool, 'labs');
  const result = await builder
    .select(['id', 'name'])
    .eq('state', 'MH')
    .ilike('name', 'ABC')
    .limit(10)
    .execute();

  assert.equal(result.error, null);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /SELECT `id`, `name` FROM `labs`/i);
  assert.match(calls[0].sql, /WHERE/);
  assert.deepEqual(calls[0].params, ['MH', '%ABC%', 10]);
});

test('MysqlQueryBuilder can be awaited directly', async () => {
  const pool = {
    query: async () => [[{ id: 2 }], null]
  };

  const result = await new MysqlQueryBuilder(pool, 'labs').select('id').limit(1);

  assert.deepEqual(result.data, [{ id: 2 }]);
  assert.equal(result.error, null);
});
