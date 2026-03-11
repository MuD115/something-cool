const SYRIA_CITIES = [
  { name: 'Damascus', lat: 33.5138, lng: 36.2765, aliases: ['damascus', 'dimashq'] },
  { name: 'Aleppo', lat: 36.2021, lng: 37.1343, aliases: ['aleppo', 'halab'] },
  { name: 'Homs', lat: 34.7324, lng: 36.7137, aliases: ['homs', 'hims'] },
  { name: 'Idlib', lat: 35.9306, lng: 36.6339, aliases: ['idlib'] },
  { name: 'Raqqa', lat: 35.9528, lng: 39.0103, aliases: ['raqqa', 'raqqah'] },
  { name: 'Deir ez-Zor', lat: 35.3359, lng: 40.1408, aliases: ['deir ez-zor', 'deir ezzor', 'deir al-zor'] },
  { name: 'Daraa', lat: 32.6189, lng: 36.1021, aliases: ['daraa', 'deraa'] },
  { name: 'Latakia', lat: 35.5317, lng: 35.7918, aliases: ['latakia', 'lattakia'] },
  { name: 'Qamishli', lat: 37.0489, lng: 41.2261, aliases: ['qamishli', 'qamishlo', 'kamishli'] },
  { name: 'Tartus', lat: 34.8890, lng: 35.8866, aliases: ['tartus', 'tartous'] },
  { name: 'Hasakah', lat: 36.5025, lng: 40.7440, aliases: ['hasakah', 'hasaka', 'al-hasakah'] },
  { name: 'Palmyra', lat: 34.5504, lng: 38.2668, aliases: ['palmyra', 'tadmur'] },
  { name: 'Manbij', lat: 36.5283, lng: 37.9544, aliases: ['manbij'] },
  { name: 'Afrin', lat: 36.5122, lng: 36.8689, aliases: ['afrin'] },
  { name: 'Kobani', lat: 36.8910, lng: 38.3535, aliases: ['kobani', 'kobane', 'ain al-arab'] },
];

function extractCities(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const city of SYRIA_CITIES) {
    for (const alias of city.aliases) {
      if (lower.includes(alias)) {
        found.push({ name: city.name, lat: city.lat, lng: city.lng });
        break;
      }
    }
  }
  return found;
}

module.exports = { extractCities, SYRIA_CITIES };
