import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSchema} from './schema-parser.mjs';
test('composite identity, decimal types and foreign keys remain distinct',()=>{
  const [table]=parseSchema('CREATE TABLE `evidence` (`a` BIGINT NOT NULL, `b` INT NOT NULL, `ratio` DECIMAL(5,4) NULL, PRIMARY KEY (`a`,`b`), CONSTRAINT uq UNIQUE (`b`,`ratio`), CONSTRAINT fk FOREIGN KEY (`a`,`b`) REFERENCES `parent` (`id`,`revision`), CHECK (ratio BETWEEN 0 AND 1)) ENGINE=InnoDB;');
  assert.deepEqual(table.primaryKey,['a','b']);assert.deepEqual(table.uniqueKeys,[['b','ratio']]);
  assert.deepEqual(table.foreignKeys,[{columns:['a','b'],target:'parent',targetColumns:['id','revision']}]);
  assert.deepEqual(table.columns.at(-1),{name:'ratio',type:'DECIMAL(5,4)',nullable:true});
});
test('inline primary keys and later nullable changes describe the effective schema',()=>{
  const [table]=parseSchema("CREATE TABLE credential (member_id BIGINT UNSIGNED PRIMARY KEY, password_hash VARCHAR(100) NOT NULL, status VARCHAR(20) DEFAULT 'ACTIVE'); ALTER TABLE credential MODIFY password_hash VARCHAR(100) NULL;");
  assert.deepEqual(table.primaryKey,['member_id']);assert.equal(table.columns[0].nullable,false);assert.equal(table.columns[1].nullable,true);
});
test('malformed or unmatched alterations fail instead of publishing incomplete metadata',()=>{
  assert.throws(()=>parseSchema('CREATE TABLE t (id INT'),/Unclosed table/);
  assert.throws(()=>parseSchema('ALTER TABLE missing MODIFY unknown INT NULL;'),/Unknown ALTER column/);
});
