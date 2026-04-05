import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
})
export class HelpComponent {
  openFaq: number | null = null;

  faqs = [
    {
      q: 'Comment passer une commande ?',
      a: 'Parcourez notre collection, sélectionnez le produit de votre choix, ajoutez-le au panier puis finalisez votre commande en quelques étapes. Vous recevrez une confirmation par email immédiatement.'
    },
    {
      q: 'Quels sont les modes de paiement acceptés ?',
      a: 'Nous acceptons les paiements via Wave CI et Mobile Money (Orange Money, MTN Money). Tous les paiements sont sécurisés et cryptés.'
    },
    {
      q: 'Quel est le délai de livraison ?',
      a: 'Les commandes sont livrées sous 24 à 48h dans Abidjan. Pour l\'intérieur du pays, compter au maximum 72h selon la zone.'
    },
    {
      q: 'Comment suivre ma commande ?',
      a: 'Rendez-vous dans la section "Mes commandes" de votre espace personnel. Vous y trouverez le statut en temps réel de chaque commande passée.'
    },
    {
      q: 'Puis-je retourner un article ?',
      a: 'Oui, vous disposez de 3 jours après la date de réception pour retourner tout article non utilisé dans son emballage d\'origine. Contactez notre service client pour initier le retour.'
    },
    {
      q: 'Comment créer un compte ?',
      a: 'Cliquez sur "S\'inscrire" en haut à droite de la page, renseignez vos informations et validez. Votre compte est actif immédiatement.'
    },
    {
      q: 'Que faire si un article est endommagé à la réception ?',
      a: 'Refusez le colis ou signalez-le immédiatement en contactant notre service client sous 48h avec photos à l\'appui. Nous procéderons à un remplacement ou un remboursement intégral.'
    },
  ];

  toggle(i: number): void {
    this.openFaq = this.openFaq === i ? null : i;
  }
}
