'use client';

// v31: Game Island — đảo trò chơi của Knoworld City.
// Harbour Cup: đua thuyền theo thời gian, thứ tự về đích = thứ tự thuyết trình.
// Lucky Cards (v34): mỗi nhóm lật 1 lá bài, sau lá bài là 5 thương hiệu (có logo), không nhóm nào trùng.
import { useEffect, useRef, useState } from 'react';
import CityPage from '../components/city/CityPage';
import { useAuth } from '../components/AuthProvider';
import { mountCityGames } from '@/lib/cityGames';
import { loadGameDefaults, saveGameDefaults, publishRound, latestRounds } from '@/lib/games';
import { timeAgo } from '@/lib/discussion';
import './games.css';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const MARKUP = "<div class=\"kwgm-tabs\">\n    <div class=\"tabs\" role=\"tablist\" aria-label=\"Games\">\n      <button class=\"tab\" role=\"tab\" id=\"tab-order\" aria-controls=\"order\" aria-selected=\"true\">\n        <svg width=\"30\" height=\"30\" viewBox=\"0 0 32 32\" aria-hidden=\"true\"><path d=\"M4 20h24l-3 6H7z\" fill=\"#c6bfff\"/><rect x=\"10\" y=\"13\" width=\"12\" height=\"7\" rx=\"1\" fill=\"#ece9f5\"/><rect x=\"15\" y=\"7\" width=\"2\" height=\"6\" fill=\"#ffd27a\"/></svg>\n        <span><b>Harbour Cup</b><span>Boat race for presenting order</span></span>\n      </button>\n      <button class=\"tab\" role=\"tab\" id=\"tab-brands\" aria-controls=\"brands\" aria-selected=\"false\">\n        <svg width=\"30\" height=\"30\" viewBox=\"0 0 32 32\" aria-hidden=\"true\"><rect x=\"3\" y=\"6\" width=\"26\" height=\"15\" rx=\"2\" fill=\"none\" stroke=\"#7ef0ff\" stroke-width=\"2.4\"/><path d=\"M10 21v7M22 21v7\" stroke=\"#7ef0ff\" stroke-width=\"2.4\"/><path d=\"M8 13h16\" stroke=\"#ffd27a\" stroke-width=\"2.4\"/></svg>\n        <span><b>Lucky Cards</b><span>Flip a card, win 5 brands</span></span>\n      </button>\n    </div>\n</div>\n<div class=\"kwgm-main\">\n\n\n    <!-- ================= GAME 1: BOAT RACE ================= -->\n    <section id=\"order\" role=\"tabpanel\" aria-labelledby=\"tab-order\">\n      <div class=\"grid\">\n        <div class=\"panel setup\">\n          <div><h2 class=\"h2\">Teams on the start line</h2><p class=\"sub\">One group per line. These names are shared with Game 2.</p></div>\n          <label class=\"f\" for=\"groups\">Groups\n            <textarea id=\"groups\" spellcheck=\"false\"></textarea>\n          </label>\n          <div class=\"note\" id=\"groupCount\"></div>\n          <div class=\"row\">\n            <button class=\"btn\" id=\"quick6\">Nhóm 1–6</button>\n            <button class=\"btn\" id=\"quick8\">Nhóm 1–8</button>\n            <button class=\"btn\" id=\"quick10\">Nhóm 1–10</button>\n          </div>\n          <div class=\"f\" style=\"margin-top:4px\">Race length\n            <div class=\"seg\" role=\"group\" aria-label=\"Race length\" id=\"lengths\">\n              <button type=\"button\" data-s=\"10\" aria-pressed=\"false\">10 s</button>\n              <button type=\"button\" data-s=\"20\" aria-pressed=\"true\">20 s</button>\n              <button type=\"button\" data-s=\"30\" aria-pressed=\"false\">30 s</button>\n              <button type=\"button\" data-s=\"45\" aria-pressed=\"false\">45 s</button>\n              <button type=\"button\" data-s=\"60\" aria-pressed=\"false\">60 s</button>\n            </div>\n          </div>\n          <div class=\"note\">The last boat crosses the line exactly when the time runs out. Finishing order = presenting order.</div>\n          <div class=\"row\" style=\"margin-top:4px\">\n            <button class=\"btn gold\" id=\"startRace\">🚩 Start the race</button>\n            <button class=\"btn\" id=\"resetRace\">Back to start line</button>\n          </div>\n          <button class=\"btn\" id=\"copyOrder\">Copy presenting order</button>\n          <div class=\"admin-row\" data-admin hidden>\n            <span class=\"lbl\">Lecturer</span>\n            <button class=\"btn\" id=\"saveGroups\">💾 Save group list</button>\n            <button class=\"btn primary\" id=\"publishOrder\">📣 Publish order</button>\n          </div>\n        </div>\n\n        <div class=\"panel\">\n          <div><h2 class=\"h2\">Harbour Cup</h2><p class=\"sub\">Speeds change all race long, so the lead can switch right up to the line.</p></div>\n          <div class=\"race-top\" aria-live=\"polite\">\n            <div class=\"race-clock\" id=\"clock\">0:20</div>\n            <div class=\"ticker\"><div class=\"who\" id=\"tickWho\">Boats on the start line</div><div class=\"sub2\" id=\"tickSub\">Pick a race length and press “Start the race”</div></div>\n            <div class=\"leader\" id=\"leaderBox\">Leading<b id=\"leaderName\">–</b></div>\n          </div>\n          <div class=\"progress\"><i id=\"bar\"></i></div>\n          <div class=\"water\"><canvas id=\"race\"></canvas></div>\n          <div class=\"departures\">\n            <div class=\"dh\"><span>Order</span><span>Group</span><span>Finish</span></div>\n            <ol id=\"board\"></ol>\n          </div>\n        </div>\n      </div>\n    </section>\n\n    <!-- ================= GAME 2: CARD FLIP ================= -->\n    <section id=\"brands\" role=\"tabpanel\" aria-labelledby=\"tab-brands\" hidden>\n      <div class=\"grid\">\n        <div class=\"panel setup\">\n          <div><h2 class=\"h2\">Brand list</h2><p class=\"sub\">One brand per line. Each card hides 5 brands from this list.</p></div>\n          <label class=\"f\" for=\"brandList\">Brands\n            <textarea id=\"brandList\" spellcheck=\"false\" style=\"min-height:200px\"></textarea>\n          </label>\n          <div class=\"note\" id=\"brandCount\"></div>\n          <div class=\"row\" style=\"gap:10px\">\n            <label class=\"f\" for=\"cardCount\" style=\"flex:1\">Number of cards\n              <input id=\"cardCount\" type=\"number\" min=\"4\" max=\"40\" value=\"20\">\n            </label>\n            <label class=\"f\" for=\"perCard\" style=\"flex:1\">Brands per card\n              <input id=\"perCard\" type=\"number\" min=\"1\" max=\"8\" value=\"5\">\n            </label>\n          </div>\n          <div class=\"note\" id=\"capacity\"></div>\n          <div class=\"note\">🔒 No brand appears on two cards, so no two groups can get the same brand.</div>\n          <div class=\"row\" style=\"margin-top:4px\">\n            <button class=\"btn gold\" id=\"shuffleDeck\">🔀 Shuffle a new deck</button>\n          </div>\n          <div class=\"row\">\n            <button class=\"btn\" id=\"undoPick\">↶ Undo last pick</button>\n            <button class=\"btn\" id=\"copyBrands\">Copy results</button>\n          </div>\n          <div class=\"admin-row\" data-admin hidden>\n            <span class=\"lbl\">Lecturer</span>\n            <button class=\"btn\" id=\"saveBrands\">💾 Save brand list</button>\n            <button class=\"btn primary\" id=\"publishBrands\">📣 Publish brands</button>\n          </div>\n          <form class=\"row\" id=\"addGroupForm\" style=\"margin-top:6px\">\n            <input id=\"newGroup\" placeholder=\"New group name\" maxlength=\"40\" style=\"flex:1;min-width:0;background:#0e0d16;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;font-size:13px\">\n            <button class=\"btn primary\" type=\"submit\">+ Add group</button>\n          </form>\n        </div>\n\n        <div class=\"panel\">\n          <div><h2 class=\"h2\">Pick a card</h2><p class=\"sub\">Groups take turns in the Harbour Cup finishing order. Call out a number, tap that card, and the 5 brands behind it are yours.</p></div>\n          <div class=\"turnbar\" id=\"turnbar\" aria-live=\"polite\">\n            <span class=\"chip\" id=\"turnChip\"></span>\n            <div class=\"t\"><b id=\"turnWho\">–</b><span id=\"turnSub\"></span></div>\n            <button class=\"btn\" id=\"revealRest\" hidden>👀 Reveal the other cards</button>\n          </div>\n          <div class=\"reveal\" id=\"reveal\" hidden aria-live=\"polite\"></div>\n          <div class=\"deck\" id=\"deck\"></div>\n          <div class=\"ledger\">\n            <h3 class=\"h2\" style=\"font-size:15px\">Who got what</h3>\n            <div class=\"tbl\"><table><thead><tr><th>Turn</th><th>Group</th><th>Card</th><th>Brand</th></tr></thead><tbody id=\"ledger\"></tbody></table></div>\n          </div>\n        </div>\n      </div>\n    </section>\n  </div>\n<canvas id=\"confetti\" aria-hidden=\"true\" style=\"position:fixed;inset:0;pointer-events:none;z-index:60\"></canvas>\n<div class=\"toast\" id=\"toast\" hidden></div>\n";

export default function GamesPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const ref = useRef(null);
  const [rounds, setRounds] = useState({});

  const refresh = () => latestRounds().then(setRounds).catch(() => {});
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (loading || !ref.current) return undefined;
    let cleanup = null;
    let alive = true;
    loadGameDefaults().catch(() => ({})).then((d) => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = MARKUP;
      cleanup = mountCityGames(ref.current, {
        groups: d?.groups,
        brands: d?.brands,
        isAdmin,
        onSaveGroups: (groups) => saveGameDefaults({ groups }),
        onSaveBrands: (brands) => saveGameDefaults({ brands }),
        onPublish: async (kind, data) => { const r = await publishRound(kind, data, user); if (!r.error) refresh(); return r; },
      });
    });
    return () => { alive = false; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const race = rounds.race;
  const brands = rounds.brands;

  return (
    <CityPage
      place="games"
      title="Game Island"
      subtitle="Two quick games for presentation day. Race the ferries to decide who presents first, then flip a lucky card: behind every number are 5 brands, never shared between groups."
    >
      <div className="kwgm" ref={ref} />

      {(race || brands) && (
        <section className="kwgm" aria-labelledby="pubH">
          <div className="panel published">
            <h2 className="h2" id="pubH">Published by your lecturer</h2>
            <p className="sub">The latest official results. They also appear on the City Notice Board.</p>
            <div className="pub-grid">
              {race && (
                <div className="pub-card">
                  <h4>🏁 Presenting order</h4>
                  <div className="when">{timeAgo(race.created_at)}</div>
                  <ol>{(race.data?.order || []).map((g) => <li key={g}><b>{g}</b></li>)}</ol>
                </div>
              )}
              {brands && (
                <div className="pub-card">
                  <h4>🪧 Brands per group</h4>
                  <div className="when">{timeAgo(brands.created_at)}</div>
                  <ul>{(brands.data?.groups || []).map((g) => <li key={g.group}><b>{g.group}{g.card ? ` (card #${g.card})` : ''}:</b> {(g.brands || []).join(', ')}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </CityPage>
  );
}
