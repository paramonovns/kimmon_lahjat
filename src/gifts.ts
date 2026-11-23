export interface Gift {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  detail: string;
  image: string;
  query: string;
  source: string;
}

export const gifts: Gift[] = [
  {
    id: 7,
    title: "LEGO · Весёлые горки",
    subtitle: "Luovat rampit ja ajoneuvot 3in1",
    category: "Собирать и придумывать",
    detail: "DUPLO · 10478 · 3+",
    image: "lego.jpg",
    query: "LEGO DUPLO 10478 Luovat rampit ajoneuvot osta Suomi",
    source: "https://www.lego.com/fi-fi/product/3-in-1-creative-ramps-with-vehicles-10478",
  },
  {
    id: 8,
    title: "Рации для маленьких приключений",
    subtitle: "Radiopuhelimet · Walkie Talkie",
    category: "На связи с чудесами",
    detail: "Пример: детские рации · 3+",
    image: "walkie-talkies.jpg",
    query: "lasten radiopuhelimet Walkie Talkie 3 vuotta Suomi",
    source: "https://www.prisma.fi/tuotteet/111143033/walkie-talkie-radiopuhelimet-111143033",
  },
  {
    id: 9,
    title: "Маленькие домашние помощники",
    subtitle: "Spire Kodinkoneet leikkisetti",
    category: "Как у взрослых",
    detail: "Игровой набор бытовой техники",
    image: "appliances.jpg",
    query: "Spire Kodinkoneet leikkisetti",
    source: "https://www.k-ruoka.fi/kauppa/tuotemerkit/spire-10697",
  },
  {
    id: 10,
    title: "Свой домик для приключений",
    subtitle: "Spire Leikkiteltta",
    category: "Место для волшебства",
    detail: "Игровая палатка · 90 × 98 × 300 см",
    image: "tent.jpg",
    query: "Spire 3 in 1 Leikkiteltta 90 98 300 5712877759725",
    source: "https://haukka.io/tarjous/91500244/spire-spire-3-in-1-leikkiteltta-90x98x300-cm",
  },
  {
    id: 11,
    title: "Магнитный мир",
    subtitle: "Magneettileikkisetti",
    category: "Строить без границ",
    detail: "Пример: MAGNA-TILES Classic 32 · 3+",
    image: "magnetic-tiles.jpg",
    query: "MAGNA TILES Classic 32 magneettileikkisetti Suomi",
    source: "https://magnatiles.com/products/magna-tiles-classic-32-piece-set",
  },
  {
    id: 12,
    title: "Навстречу снежным приключениям",
    subtitle: "Rattikelkka · снегокат",
    category: "Зима зовёт",
    detail: "Пример: Nordcore · 3+",
    image: "snowracer.jpg",
    query: "Nordcore rattikelkka sininen 3 vuotta",
    source: "https://www.hobbybox.fi/nordcore-rattikelkka-sininen",
  },
  {
    id: 13,
    title: "Купание для любимой куклы",
    subtitle: "BABY born Kylpyamme",
    category: "Забота в маленьких ладошках",
    detail: "Ванночка для куклы · 837993 · 3+",
    image: "baby-born.jpg",
    query: "BABY born kylpyamme 837993 Suomi",
    source: "https://www.dreamland.be/nl/producten/baby-born-badkuip/02371269",
  },
  {
    id: 14,
    title: "Тянуть, мять и удивляться",
    subtitle: "Play-Doh Slime",
    category: "Творческий беспорядок",
    detail: "Пример: Neon Orange · F5989 · 3+",
    image: "slime.jpg",
    query: "Play Doh Slime Neon Orange F5989 Suomi",
    source:
      "https://consumercare.hasbro.com/en-us/product/play-doh-slime-neon-orange-single-can-3-2-ounces-non-toxic/C2181ECD-481B-4865-8C1A-6A473E51841A",
  },
  {
    id: 15,
    title: "На кухне маленького шефа",
    subtitle: "Play-Doh Kuuma keittiö",
    category: "Вкусные фантазии",
    detail: "«Горячая кухня» · G2309 · 3+",
    image: "kitchen.jpg",
    query: "Play Doh Kuuma keittiö G2309 Suomi",
    source:
      "https://instructions.hasbro.com/en-us/instruction/play-doh-super-sizzlin-kitchen-playset",
  },
];
