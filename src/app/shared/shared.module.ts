import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FooterComponent } from './components/footer/footer.component';
import { HotelCardComponent } from './components/hotel-card/hotel-card.component';
import { LoaderComponent } from './components/loader/loader.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { TravelChatbotComponent } from './components/travel-chatbot/travel-chatbot.component';

@NgModule({
  declarations: [
    FooterComponent,
    HotelCardComponent,
    LoaderComponent,
    NavbarComponent,
    TravelChatbotComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe
  ],
  exports: [
    CommonModule,
    FooterComponent,
    HotelCardComponent,
    LoaderComponent,
    NavbarComponent,
    TravelChatbotComponent
  ]
})
export class SharedModule {}
