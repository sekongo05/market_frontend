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
      a: 'Oui, tant que votre commande est en attente (statut "En attente") ou confirmée (statut "Confirmée"), vous pouvez l\'annuler depuis la section "Mes commandes". Une fois la commande expédiée, l\'annulation n\'est plus possible — vous devrez initier un retour après réception.'
    },
    {
      q: 'Puis-je modifier ma commande après l\'avoir passée ?',
      a: 'Non. Une fois la commande soumise, il n\'est pas possible de modifier les articles ou la quantité. Si vous avez commis une erreur, annulez la commande depuis "Mes commandes" (tant qu\'elle n\'est pas expédiée) et recommandez.'
    },
    {
      q: 'Que signifient les statuts de commande ?',
      a: 'En attente : votre commande a été reçue et est en cours de vérification. — Confirmée : notre équipe a validé votre commande et prépare vos articles. — Expédiée : votre colis a été remis au livreur. — Livrée : votre commande a été livrée. — Annulée : la commande a été annulée.'
    },
    // ── Livraison
    {
      q: 'Quel est le délai de livraison ?',
      a: 'Nous livrons sous 24 à 48h dans Abidjan et ses communes, et sous 72h maximum pour l\'intérieur de la Côte d\'Ivoire. Les délais peuvent varier en cas de forte demande ou de situation exceptionnelle.'
    },
    {
      q: 'Y a-t-il des frais de livraison ?',
      a: 'Non. La livraison est entièrement gratuite pour toutes les commandes, partout en Côte d\'Ivoire. Le prix affiché sur le produit est le prix que vous payez, sans supplément.'
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
      a: 'Photographiez immédiatement l\'article et son emballage, puis contactez-nous sous 48h par email (sdmstore05@gmail.com) ou par téléphone en indiquant votre numéro de commande et en joignant les photos.'
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
  ];

  toggle(i: number): void {
    this.openFaq = this.openFaq === i ? null : i;
  }
}
