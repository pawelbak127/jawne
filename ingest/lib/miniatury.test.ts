import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { zalozSchemat } from './baza';
import { uzupelnijMiniatury } from './miniatury';

// Zdjecie jak z rejestru: 110 x 137 px, JPEG o wysokiej jakosci (stad 14 kB w oryginalach).
const zdjecie = (r: number) => sharp({ create: { width: 110, height: 137, channels: 3, background: { r, g: 120, b: 90 } } })
  .jpeg({ quality: 100 }).toBuffer();

function baza(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  zalozSchemat(db);
  db.prepare("insert into poslowie(id, slug, imie, nazwisko, imie_nazwisko, aktywny) values (1, 'a-b', 'A', 'B', 'A B', 1)").run();
  return db;
}

describe('uzupelnijMiniatury', () => {
  it('dorabia brakujace, drugi przebieg nie ma nic do roboty', async () => {
    const db = baza();
    db.prepare('insert into zdjecia(posel_id, typ, bajty) values (1, ?, ?)').run('image/jpeg', await zdjecie(200));
    expect((await uzupelnijMiniatury(db))?.dorobiono).toBe(1);
    const m = db.prepare('select miniatura from zdjecia').get() as { miniatura: Uint8Array };
    const meta = await sharp(m.miniatura).metadata();
    // withoutEnlargement: zdjecie 110 px zostaje 110 px, tylko lzejsze.
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 110, 137]);
    expect((await uzupelnijMiniatury(db))?.dorobiono).toBe(0);
  });

  it('zmiana zdjecia w etapie `zdjecia` zeruje miniature, to samo zdjecie — nie', async () => {
    const db = baza();
    // To samo zapytanie co importZdjec.
    const wstaw = db.prepare(`insert into zdjecia(posel_id, typ, bajty) values (?,?,?)
       on conflict(posel_id) do update set typ=excluded.typ, bajty=excluded.bajty,
         miniatura = case when zdjecia.bajty = excluded.bajty then zdjecia.miniatura end`);
    const stare = await zdjecie(200);
    wstaw.run(1, 'image/jpeg', stare);
    await uzupelnijMiniatury(db);
    wstaw.run(1, 'image/jpeg', stare);
    expect((db.prepare('select miniatura is not null as m from zdjecia').get() as { m: number }).m).toBe(1);
    wstaw.run(1, 'image/jpeg', await zdjecie(30));
    expect((db.prepare('select miniatura is not null as m from zdjecia').get() as { m: number }).m).toBe(0);
  });
});
