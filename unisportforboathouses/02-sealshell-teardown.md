# Sealshell.com — rozbor konkurenta

Prohlídka webu 17. 9. 2026 (desktop i mobil, anglická i česká verze, technická
kontrola pod kapotou).

## Kdo to je

SaaS pro veslařské kluby. Staví ho **Jakub Kyncl** a **Radim Hladík**, dva čeští
veslaři z VK Blesk.

- Jakub: Northeastern University Boston (absolvoval 5/2026), kapitán veslařského
  programu 2024/25, finále A na IRA 2023, 3. a 4. na MSJ, 6. na MS U23,
  MS 2022. Chce zpátky do reprezentace pro 2027.
- Radim: 16 let veslování, zlato + světový rekord na čtyřce na MSJ 2018, trenér
  ve VK Blesk od 2022, poslední rok se stará i o flotilu klubu. Učí fyziku a
  matematiku na gymnáziu.

Radimova role u flotily je důležitá: **doménovou znalost o vybavení mají
z první ruky.**

## Produkt — 11 modulů

Přehled a lodní kniha · Lodě (seřízení + historie) · Vesla (tvrdost, přiřazení) ·
Nakládání vleku · Seat racing · **Seal** (AI asistent na dotazy k seřízení) ·
Sportovci · Stopky a tempo · Údržba (závady s fotkou, závažností, termínem) ·
Historie · Vybavení (trenažéry, motorové čluny, vleky, nářadí)

**Těžiště je vybavení a provoz loděnice, ne trénink.** Modul "Sportovci" umí jen
výšku, váhu, časy na trenažéru a aktuální vybavení. To je jejich slabina.

## Ceník

| Plán | Cena | Limit |
|---|---|---|
| Malý klub a univerzita | $1 399 / rok (~30 000 Kč) | 100 sportovců, 5 trenérů |
| Federace a velké kluby | $1 899 / rok (~41 000 Kč) | 300 sportovců, 10 loginů |

Bez trialu. Ceník je v dolarech **i na české verzi** — plus věta "Veslařský klub
v Česku? napište nám a domluvíme místní ceny". Tzn. dolarový ceník míří na
USA/UK, Česko je referenční trh.

### Jak sedí proti konkurenci

| | 300 sportovců | trial |
|---|---|---|
| Sealshell | $1 899 / rok | žádný |
| Row HQ | ~$1 360 / rok | 6 měsíců zdarma, do 20 členů zdarma navždy |
| BoatSched | od £30/měs ≈ $460 / rok | — |

**Jsou na horním konci trhu a nemají trial.** Web se o obhajobu ceny nijak
nepokouší — žádné srovnání, žádná věta "proč to stojí víc".

## Co dělají dobře

- **Headline.** "Aplikace, na které běží celá loděnice" + "Postavené pro
  veslařské kluby, ne pro tabulky." Jasný slib, jasný nepřítel (Excel).
- **Copy psal někdo z loděnice.** "Zpožděná · venku 48 min", tvrdost vesel,
  nakládání vleku, seat racing kde se průměry mění jak přesazuješ. Trenér
  okamžitě pozná, že mu rozumí.
- **Česká verze je psaná, ne přeložená.** Velký rozdíl proti zahraniční
  konkurenci.
- **Zakladatelský příběh je reálný a ověřitelný.** V takhle malé komunitě je to
  jejich největší prodejní argument — víc než jakákoli funkce.
- **Technicky čisté.** Next.js na Vercelu, načte se za ~0,2 s, 12 requestů,
  žádné cookie lišty, žádné tracking skripty. Konzistentní design.
- Karty funkcí, které se otevřou a ukážou obrazovku, místo seznamu odrážek.

## Kde mají díry (a kde jde zaútočit)

1. **Na celém webu není jediný formulář.** Nula. "Domluvit ukázku" je `mailto:`
   odkaz — na mobilu tam většina lidí skončí.
2. **Žádná analytika.** Ani jeden cizí skript. Netuší, kdo k nim chodí.
3. **Chybí `og:image`.** Odkaz poslaný do trenérské WhatsApp skupiny — a tak se
   tenhle produkt šíří — se zobrazí jako holý text.
4. **Sekce o zakladatelích je největší na stránce** (na mobilu 3 205 px, víc než
   ceník a všech 11 funkcí dohromady).
5. **Žádný důkaz od zákazníků.** Ani jedno logo klubu, ani jeden citát, ani
   jedno číslo. Za 1 399 $/rok je první otázka "kdo to používá?".
6. **Obrazovky jsou překreslené mockupy, ne screenshoty** (3 obrázky na celém
   webu). Hraje to proti otázce "je ten produkt vůbec hotový?".
7. **Rolovací animace na mobilu** — při scrollování lze chytit celou obrazovku
   prázdnou.
8. **Žádná zkušební verze.**
9. **Trenérská a tréninková strana je tenká.** ← **tohle je ta největší díra
   a zároveň to, co UNIsport už umí.**

## Co si z toho vzít

- Nemají zákazníky a nemají referenci. **Závod není prohraný.**
- V Itálii mají **stejný problém jako my** — jsou Češi a nikoho tam neznají.
  Itálii nevyhraje lepší produkt, vyhraje ji ten, kdo tam má známé.
- Jejich síla je vybavení, naše je trénink. To není náhoda — každý staví to,
  co zná.
- Prát se s nimi o 47 českých klubů je nesmysl. **Za zvážení stojí i zavolat
  jim** a domluvit se: my máme trenérskou stranu a americkou univerzitní
  scénu, oni vybavení a Evropu.
