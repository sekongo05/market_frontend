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
    // ── Commandes
    {
      q: 'Comment passer une commande ?',
      a: 'Parcourez notre collection, sélectionnez l\'article de votre choix et ajoutez-le au panier. Depuis le panier, indiquez votre numéro de téléphone et votre adresse de livraison, puis confirmez. Vous recevez immédiatement un email de confirmation avec votre numéro de commande.'
    },
    {
      q: 'Puis-je annuler ou modifier ma commande ?',
      a: 'Vous pouvez annuler votre commande tant qu\'elle est au statut "En attente" ou "Confirmée", directement depuis la section "Mes commandes". Si vous souhaitez changer un article ou une quantité, annulez la commande et passez-en une nouvelle — c\'est rapide. Une fois la commande expédiée, il ne sera plus possible d\'intervenir dessus.'
    },
    // ── Livraison
    {
      q: 'Quel est le délai de livraison ?',
      a: 'Nous livrons sous 24 à 48h dans Abidjan et ses communes, et sous 72h maximum pour l\'intérieur de la Côte d\'Ivoire. Les délais peuvent varier en cas de forte demande ou de situation exceptionnelle.'
    },
    {
      q: 'Y a-t-il des frais de livraison ?',
      a: 'Oui. Les frais de livraison sont de 1 500 FCFA pour Abidjan et de 2 000 FCFA pour l\'intérieur de la Côte d\'Ivoire. Ces frais sont affichés clairement avant la confirmation de votre commande.'
    },
    {
      q: 'Que se passe-t-il si je suis absent lors de la livraison ?',
      a: 'Notre livreur vous contactera par téléphone avant de se présenter. En cas d\'absence, un nouveau créneau de livraison sera convenu avec vous. Assurez-vous que le numéro de téléphone renseigné lors de la commande est bien joignable.'
    },
    {
      q: 'Comment suivre ma commande ?',
      a: 'Connectez-vous à votre compte et rendez-vous dans la section "Mes commandes". Chaque commande affiche son statut actuel et son historique. Vous recevez également un email à chaque changement de statut important.'
    },
    // ── Paiement
    {
      q: 'Quels modes de paiement sont acceptés ?',
      a: 'Nous acceptons le paiement via Wave CI. Le règlement s\'effectue au moment de la livraison — vous payez lorsque vous recevez votre commande entre les mains du livreur.'
    },
    // ── Retours
    {
      q: 'Puis-je retourner un article ?',
      a: 'Oui. Vous disposez de 24 heures après la date de réception pour initier un retour. L\'article doit être non utilisé, dans son emballage d\'origine. Connectez-vous, allez dans "Mes commandes", sélectionnez la commande concernée et cliquez sur "Retourner un article". Consultez notre politique de retour complète pour les conditions détaillées.'
    },
    {
      q: 'Que faire si un article est endommagé ou non conforme à la réception ?',
      a: 'Photographiez immédiatement l\'article et son emballage, puis contactez notre service client sous 48h en indiquant votre numéro de commande et en joignant les photos. Nous traitons ce type de situation en priorité.'
    },
    // ── Compte
    {
      q: 'Comment créer un compte ?',
      a: 'Cliquez sur "S\'inscrire" en haut de la page, renseignez votre nom, email et mot de passe. Votre compte est actif immédiatement et vous donne accès à votre historique de commandes, vos notifications et la gestion de votre profil.'
    },
    {
      q: 'Mes données personnelles sont-elles sécurisées ?',
      a: 'Oui. Toutes les communications sont chiffrées via HTTPS. Vos mots de passe sont stockés sous forme hachée et ne sont jamais lisibles. Nous ne partageons jamais vos données avec des tiers à des fins commerciales. Consultez notre politique de confidentialité pour les détails complets.'
    },
    // ── Contact
    {
      q: 'Comment contacter le service client ?',
      a: 'Plusieurs options s\'offrent à vous : via le bouton WhatsApp disponible sur toutes les pages pour une réponse rapide, par email via le formulaire de contact, ou directement depuis la section "Mes commandes" pour tout ce qui concerne une commande en cours. Nous répondons dans les meilleurs délais, généralement sous quelques heures.'
    },
  ];

  toggle(i: number): void {
    this.openFaq = this.openFaq === i ? null : i;
  }
}
