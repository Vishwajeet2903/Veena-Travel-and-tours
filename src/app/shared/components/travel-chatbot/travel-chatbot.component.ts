import { Component } from '@angular/core';

type ChatMessage = {
  author: 'bot' | 'user';
  text: string;
  places?: string[];
};

type CityGuide = {
  aliases: string[];
  places: string[];
};

const CITY_GUIDES: CityGuide[] = [
  {
    aliases: ['mumbai', 'bombay'],
    places: ['Gateway of India', 'Marine Drive', 'Elephanta Caves', 'Chhatrapati Shivaji Maharaj Terminus', 'Juhu Beach']
  },
  {
    aliases: ['delhi', 'new delhi'],
    places: ['India Gate', 'Red Fort', 'Qutub Minar', 'Humayun Tomb', 'Lotus Temple']
  },
  {
    aliases: ['goa'],
    places: ['Baga Beach', 'Fort Aguada', 'Basilica of Bom Jesus', 'Dudhsagar Falls', 'Anjuna Flea Market']
  },
  {
    aliases: ['jaipur'],
    places: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar', 'Nahargarh Fort']
  },
  {
    aliases: ['agra'],
    places: ['Taj Mahal', 'Agra Fort', 'Mehtab Bagh', 'Fatehpur Sikri', 'Itmad-ud-Daulah Tomb']
  },
  {
    aliases: ['bengaluru', 'bangalore'],
    places: ['Lalbagh Botanical Garden', 'Bengaluru Palace', 'Cubbon Park', 'ISKCON Temple', 'Commercial Street']
  },
  {
    aliases: ['hyderabad', 'hydrabad'],
    places: ['Charminar', 'Golconda Fort', 'Hussain Sagar Lake', 'Salar Jung Museum', 'Ramoji Film City']
  },
  {
    aliases: ['kolkata', 'calcutta'],
    places: ['Victoria Memorial', 'Howrah Bridge', 'Dakshineswar Kali Temple', 'Indian Museum', 'Park Street']
  },
  {
    aliases: ['chennai'],
    places: ['Marina Beach', 'Kapaleeshwarar Temple', 'Fort St. George', 'San Thome Basilica', 'Government Museum']
  },
  {
    aliases: ['pune'],
    places: ['Shaniwar Wada', 'Aga Khan Palace', 'Sinhagad Fort', 'Dagdusheth Halwai Ganpati Temple', 'Pataleshwar Cave Temple']
  },
  {
    aliases: ['nagpur'],
    places: ['Deekshabhoomi', 'Futala Lake', 'Zero Mile Stone', 'Raman Science Centre', 'Sitabuldi Fort']
  },
  {
    aliases: ['ahmedabad', 'amdavad'],
    places: ['Sabarmati Ashram', 'Adalaj Stepwell', 'Kankaria Lake', 'Sidi Saiyyed Mosque', 'Manek Chowk']
  },
  {
    aliases: ['nashik', 'nasik'],
    places: ['Trimbakeshwar Temple', 'Sula Vineyards', 'Pandavleni Caves', 'Ramkund', 'Kalaram Temple']
  },
  {
    aliases: ['satara'],
    places: ['Kaas Plateau', 'Thoseghar Waterfall', 'Ajinkyatara Fort', 'Sajjangad Fort', 'Chalkewadi Windmill Farms']
  },
  {
    aliases: ['kolhapur'],
    places: ['Mahalaxmi Temple', 'New Palace Museum', 'Rankala Lake', 'Panhala Fort', 'Jyotiba Temple']
  },
  {
    aliases: ['udaipur'],
    places: ['City Palace', 'Lake Pichola', 'Jag Mandir', 'Saheliyon Ki Bari', 'Sajjangarh Monsoon Palace']
  },
  {
    aliases: ['varanasi', 'banaras', 'kashi'],
    places: ['Dashashwamedh Ghat', 'Kashi Vishwanath Temple', 'Sarnath', 'Assi Ghat', 'Ramnagar Fort']
  },
  {
    aliases: ['manali'],
    places: ['Hadimba Devi Temple', 'Solang Valley', 'Old Manali', 'Manu Temple', 'Jogini Waterfall']
  },
  {
    aliases: ['kochi', 'cochin'],
    places: ['Fort Kochi', 'Chinese Fishing Nets', 'Mattancherry Palace', 'Jew Town', 'Marine Drive Kochi']
  }
];

@Component({
  selector: 'app-travel-chatbot',
  standalone: false,
  templateUrl: './travel-chatbot.component.html',
  styleUrls: ['./travel-chatbot.component.scss']
})
export class TravelChatbotComponent {
  isOpen = false;
  cityName = '';
  messages: ChatMessage[] = [
    {
      author: 'bot',
      text: 'Tell me a city name and I will suggest places to visit.'
    }
  ];

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  updateCity(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cityName = input.value;
  }

  suggestPlaces(): void {
    const city = this.cityName.trim();

    if (!city) {
      this.messages = [
        ...this.messages,
        {
          author: 'bot',
          text: 'Enter a city name first, for example Goa, Jaipur, Mumbai, or Delhi.'
        }
      ];
      return;
    }

    const guide = this.findGuide(city);
    this.messages = [
      ...this.messages,
      {
        author: 'user',
        text: city
      },
      guide
        ? {
            author: 'bot',
            text: `Here are popular places in ${this.formatCityName(city)}:`,
            places: guide.places
          }
        : {
            author: 'bot',
            text: `I do not have a saved guide for ${this.formatCityName(city)} yet. Try Pune, Mumbai, Nagpur, Ahmedabad, Nashik, Satara, Kolhapur, Hyderabad, Goa, Jaipur, Delhi, Agra, Bengaluru, Kolkata, Chennai, Udaipur, Varanasi, Manali, or Kochi.`
          }
    ];
    this.cityName = '';
  }

  private findGuide(city: string): CityGuide | undefined {
    const normalizedCity = this.normalize(city);
    return CITY_GUIDES.find((guide) => guide.aliases.some((alias) => this.normalize(alias) === normalizedCity));
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private formatCityName(value: string): string {
    return this.normalize(value)
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
