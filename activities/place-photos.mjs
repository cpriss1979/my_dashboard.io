export const places=[
  {
    "id": "eiffel-tower",
    "name": "Eiffel Tower, Paris",
    "author": "TheDigitalArtist",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Eiffel_tower_paris_france.jpg",
    "localFile": "eiffel-tower.jpg",
    "short": "Eiffel Tower"
  },
  {
    "id": "marina-beach",
    "name": "Marina Beach, Chennai",
    "author": "Abinayasekar357",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Marina_beach_Chennai.jpg",
    "localFile": "marina-beach.jpg",
    "short": "Marina Beach"
  },
  {
    "id": "matterhorn",
    "name": "Matterhorn, Swiss Alps",
    "author": "Paasikivi",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Matterhorn_(63110).jpg",
    "localFile": "matterhorn.jpg",
    "short": "Matterhorn"
  },
  {
    "id": "glandieu-falls",
    "name": "Glandieu Falls, France",
    "author": "Benoît Prieur",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Cascade_de_Glandieu,_octobre_2019_(1).jpg",
    "localFile": "glandieu-falls.jpg",
    "short": "Glandieu Falls"
  },
  {
    "id": "japanese-garden",
    "name": "Japanese Garden, Osaka",
    "author": "Bindyeyes",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Japanese_Garden_of_Expo%E2%80%9970_Commemorative_Park.jpg",
    "localFile": "japanese-garden.jpg",
    "short": "Japanese Garden"
  },
  {
    "id": "new-york",
    "name": "Downtown Brooklyn, New York",
    "author": "FluffballsM&Ms",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Downtown_Brooklyn_Skyline_2023.jpg",
    "localFile": "new-york.jpg",
    "short": "New York"
  },
  {
    "id": "venice",
    "name": "Grand Canal, Venice",
    "author": "Mustang Joe",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:The_Grand_Canal,_Venice_2016.jpg",
    "localFile": "venice.jpg",
    "short": "Venice"
  },
  {
    "id": "tulip-garden",
    "name": "Tulip Garden, Kashmir",
    "author": "Kajal Kumar Mukherjee",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Tulip_Garden_Kashmir.jpg",
    "localFile": "tulip-garden.jpg",
    "short": "Tulip Garden"
  },
  {
    "id": "yosemite",
    "name": "Yosemite Valley, California",
    "author": "Carol M. Highsmith",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Yosemite_by_Carol_M._Highsmith.jpg",
    "localFile": "yosemite.jpg",
    "short": "Yosemite"
  },
  {
    "id": "taj-mahal",
    "name": "Taj Mahal, Agra",
    "author": "Almbauer",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Taj_Mahal_2018.jpg",
    "localFile": "taj-mahal.jpg",
    "short": "Taj Mahal"
  },
  {
    "id": "rincon-beach",
    "name": "Rincón de la Victoria, Spain",
    "author": "Jebulon",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Parasols,_Evening,_Beach,_Rincon_de_la_Victoria,_Andalusia,_Spain.jpg",
    "localFile": "rincon-beach.jpg",
    "short": "Rincón Beach"
  },
  {
    "id": "montmorency-falls",
    "name": "Montmorency Falls, Québec",
    "author": "Wilfredor",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Parc_de_la_Chute-Montmorency_001.jpg",
    "localFile": "montmorency-falls.jpg",
    "short": "Montmorency Falls"
  }
].map(p=>({...p,src:new URL('../assets/memory-places/'+p.localFile,import.meta.url).href}));
