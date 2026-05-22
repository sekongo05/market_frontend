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
      q: 'Puis-je annuler ma commande ?',
      a: 'Vous pouvez annuler votre commande uniquement lorsqu\'elle est au statut "En attente" (avant validation par notre équipe), directement depuis la section "Mes commandes". Une fois confirmée, l\'annulation n\'est plus disponible depuis votre espace — contactez notre service client dans ce cas. Une commande expédiée ou livrée ne peut plus être annulée.'
    },
    {
      q: 'Comment suivre ma commande ?',
      a: 'Connectez-vous et rendez-vous dans "Mes commandes". Chaque commande affiche son statut en temps réel : En attente → Confirmée → En préparation → En livraison → Livrée. Vous recevez également un email et une notification à chaque étape importante.'
    },
    // ── Livraison
    {
      q: 'Quel est le délai de livraison ?',
      a: 'Nous livrons sous 24 à 48h dans Abidjan et ses communes, et sous 72h maximum pour l\'intérieur de la Côte d\'Ivoire. Les délais peuvent varier en cas de forte demande ou de situation exceptionnelle.'
    },
    {
      q: 'Y a-t-il des frais de livraison ?',
      a: 'La livraison est offerte pour toutes les commandes dans Abidjan. Pour l\'intérieur de la Côte d\'Ivoire, des frais de 2 000 FCFA s\'appliquent. Ce montant est indiqué clairement avant la confirmation de votre commande et n\'est pas remboursable.'
    },
    {
      q: 'Que se passe-t-il si je suis absent lors de la livraison ?',
      a: 'Notre livreur vous contactera par téléphone avant de se présenter. En cas d\'absence, un nouveau créneau sera convenu avec vous. Assurez-vous que le numéro de téléphone renseigné lors de la commande est bien joignable.'
    },
    // ── Paiement
    {
      q: 'Quels modes de paiement sont acceptés ?',
      a: 'Nous acceptons le paiement par Wave CI, Orange Money ou en espèces à la livraison.'
    },
    // ── Codes promo
    {
      q: 'Comment utiliser un code promo ?',
      a: 'Ouvrez votre panier et saisissez votre code dans le champ prévu, puis cliquez sur "Appliquer". La réduction est calculée et déduite automatiquement du total avant la commande. Si vous n\'êtes pas encore inscrit, les offres de bienvenue disponibles s\'affichent directement dans le panier — cliquez dessus pour les appliquer en un clic. Les codes de campagne distribués via WhatsApp ou les réseaux sociaux doivent être saisis manuellement.'
    },
    {
      q: 'Pourquoi mon code promo n\'est-il pas accepté ?',
      a: 'Plusieurs raisons peuvent bloquer un code : il est expiré, désactivé, ou a atteint son nombre maximum d\'utilisations. Les codes "premier achat" sont réservés aux nouveaux clients — si vous avez déjà une commande confirmée, expédiée ou livrée, ce type de code ne vous est plus accessible. D\'autres codes exigent un montant minimum de panier ; le message d\'erreur vous précisera le montant requis. Si votre code provient d\'une promotion externe (WhatsApp, réseaux sociaux), vérifiez qu\'il est bien actif et que sa date d\'expiration n\'est pas dépassée.'
    },
    // ── Retours
    {
      q: 'Puis-je retourner un article ?',
      a: 'Oui, sous conditions. Vous disposez de 3 jours francs à compter de la réception pour initier votre retour. Passé ce délai, le bouton de retour est automatiquement désactivé dans votre espace commandes et aucune demande ne peut être acceptée. L\'article doit être non porté, non lavé et dans son emballage d\'origine. Connectez-vous, allez dans "Mes commandes", sélectionnez la commande livrée et cliquez sur "Retourner un article".'
    },
    {
      q: 'Quel montant est remboursé en cas de retour ?',
      a: 'Seul le prix de l\'article est remboursé. Les frais de livraison initiaux ne sont jamais remboursés, car la prestation de livraison a été effectuée. Le remboursement est effectué exclusivement via Wave CI, sous 5 à 7 jours ouvrés après réception et contrôle de l\'article retourné.'
    },
    {
      q: 'Le transport retour est-il à ma charge ?',
      a: 'Oui, dans la majorité des cas. Si vous retournez un article par changement d\'avis ou pour une raison personnelle, les frais de retour sont à votre charge. En revanche, si l\'erreur provient entièrement de notre part (article défectueux, mauvais article expédié), nous organisons nous-mêmes la récupération de l\'article — sans frais pour vous.'
    },
    {
      q: 'Que faire si un article est endommagé ou non conforme à la réception ?',
      a: 'Photographiez immédiatement l\'article et son emballage, puis initiez votre retour depuis "Mes commandes" dans les 3 jours suivant la réception. Sélectionnez le motif "Article défectueux" ou "Article non conforme" et décrivez le problème. Notre équipe traite ces demandes en priorité et organise la récupération à nos frais.'
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
      a: 'Plusieurs options s\'offrent à vous : via WhatsApp au 01 53 76 13 20 pour une réponse rapide, par téléphone au 07 99 25 07 51, ou en vous rendant directement dans "Mes commandes" pour tout ce qui concerne une commande en cours. Nous répondons généralement sous quelques heures, du lundi au samedi de 8h à 20h.'
    },
  ];

  toggle(i: number): void {
    this.openFaq = this.openFaq === i ? null : i;
  }
}
