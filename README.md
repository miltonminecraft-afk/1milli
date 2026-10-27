# onemillie

[Open de website](https://miltonminecraft-afk.github.io/1milli/)

De oorspronkelijke werkplaats met de platenkast, draaitafel en werkbank. De site
zoomt naar het gekozen onderwerp. Platen staan in schuine groepen; bij bladeren
kantelen de hoezen mee. Een gekozen LP wordt uit de hoes gehaald, op de draaitafel
gelegd en kan weer worden teruggezet. De schilderijlijsten zijn hersteld en de
werkbank heeft een soldeerbout met temperatuurdisplay.

De GitHub Pages-site toont de gepubliceerde eigenaarvolgorde. Bezoekers kunnen
vrij bladeren en muziek openen. Beheer van de startvolgorde en eigen GLB-objecten
blijft beschikbaar in de lokale website op http://127.0.0.1:4270/; publiceren neemt
de gekozen inrichting en volgorde over. GitHub Pages heeft geen beheerbackend.

[Ruimtes bekijken](https://miltonminecraft-afk.github.io/1milli/room-options/)
· [Assets kiezen](https://miltonminecraft-afk.github.io/1milli/asset-options/)

De gebruiker heeft het Blender-/Unreal-traject beëindigd. De oorspronkelijke
website wordt verder ontwikkeld; eerdere projectbestanden blijven als historie
bewaard. [Werkplan](docs/werkplan.txt).

## Bouwen

De websitebron staat in `onemillie-runtime/`. Installeer daar de dependencies.
`node scripts/build-github-pages.mjs` bouwt de website en openbare keuzecatalogi
naar `H:/CodexData/Builds/onemillie/website`. `node scripts/publish-github-pages.mjs`
publiceert een schone, vastgelegde bronversie op de bestaande `gh-pages`-branch.
Nieuwe uitvoer, tijdelijke bestanden en caches staan op H:.

De geautomatiseerde controles voor collectie, uitlijning, vrije ruimte bij
bladeren en LP-beweging staan in `onemillie-runtime/tests/`. Licenties van gebruikte
modellen en de renderer staan bij de openbare assets.
