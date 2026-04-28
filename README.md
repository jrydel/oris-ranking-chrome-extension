## ORIS Ranking — Chrome extension

Doplňuje stránky [ORISu](https://oris.ceskyorientak.cz/) (přihlášky, startovky, výsledky) o aktuální RankC, RVP kategorie a předběžný zisk bodů (BZ) podle Soutěžního řádu.

![Náhled](https://github.com/jrydel/oris-ranking-chrome-extension/blob/master/images/preview.png?raw=true)

### Co umí?

- **Přihlášky / startovka** — u každého závodníka zobrazí jeho RankC, u kategorie průměr 4 nejvyšších (RVP). Top 4 závodníci tvořící RVP jsou zvýrazněni modře.
- **Výsledky** — to stejné, plus pro každého doběhnuvšího vypočítá předběžný BZ podle SŘ V.1 / V.2 / V.2.7. Zelená pilulka znamená zisk oproti aktuálnímu RankC, červená pokles, šedá závodník mimo ranking.
- Vzorec pro BZ se zobrazí jako tooltip po najetí na hodnotu.
- Rozlišuje lesní (rt=2) a sprintový (rt=8) ranking pro závody od 1.1.2026; pro starší závody používá legacy "Standardní" ranking (rt=1).

### Jak nainstalovat?

1. Stáhnout poslední verzi pluginu — [odkaz](https://github.com/jrydel/oris-ranking-chrome-extension/releases/latest).
2. V Chrome otevřít `chrome://extensions`.
3. Vpravo nahoře zapnout **Developer mode**.
4. Stáhnutý zip rozbalit a kliknout na **Load unpacked** (Načíst rozbalené) — vybrat rozbalenou složku, která obsahuje `manifest.json`.

![Instalace](https://github.com/jrydel/oris-ranking-chrome-extension/blob/master/images/install.png?raw=true)

### Pro vývojáře

```bash
bun install
bun run dev          # watch + rebuild do dist/
bun run build        # produkční build (dist/ je rovnou loadable extension)
bun run typecheck
bun run lint
bun test             # 28 unit testů
ORIS_LIVE=1 bun test tests/integration   # 9 integračních testů proti živému ORIS API
```

Vyžaduje Chrome ≥ 130.
