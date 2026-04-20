import { Resend } from 'resend';
import { env } from '@/lib/env';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not configured');
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = 'BrizoApp <info@brizoapp.com>';
const SUPPORT_EMAIL = env.BRIZO_SUPPORT_EMAIL || 'support@brizoapp.com';
const COMPANY_NAME = 'BrizoApp';
// Optional — set via env. If absent, the postal address line is omitted from the footer.
// CAN-SPAM / RGPD recommend a physical address in commercial emails.
const COMPANY_ADDRESS = env.BRIZO_LEGAL_ADDRESS || '';

async function send(to: string, subject: string, html: string, text: string) {
  // No fallback to onboarding@resend.dev: a mismatched FROM domain kills trust and
  // looks like phishing. If Resend refuses (domain not verified, quota, etc.) we fail
  // loudly so the issue is visible in monitoring.
  //
  // Note: the Resend SDK returns { data, error } instead of throwing on 4xx/5xx.
  // We MUST inspect `result.error` — a plain try/catch misses API errors entirely.
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: FROM,
      to,
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error('[Email] send rejected', {
        to,
        subject,
        error: result.error.message,
        name: result.error.name,
      });
    }
  } catch (e: any) {
    console.error('[Email] send threw', {
      to,
      subject,
      error: e?.message || String(e),
      statusCode: e?.statusCode,
    });
  }
}

// ─── Footer ───

function footerHtml(): string {
  const addrLine = COMPANY_ADDRESS
    ? `${escapeHtml(COMPANY_ADDRESS)}<br/>`
    : '';
  return `
    <hr style="border: none; border-top: 1px solid #EDEBE7; margin: 32px 0 16px;" />
    <p style="font-size: 11px; color: #B0ADA6; line-height: 1.7; margin: 0;">
      ${COMPANY_NAME} — Plateforme pour la restauration<br/>
      ${addrLine}
      <a href="mailto:${SUPPORT_EMAIL}" style="color: #B0ADA6; text-decoration: underline;">${SUPPORT_EMAIL}</a>
    </p>
    <p style="font-size: 10px; color: #B0ADA6; margin: 10px 0 0;">
      Vous recevez cet email parce que vous avez un compte sur ${COMPANY_NAME}.
    </p>
  `;
}

function footerText(): string {
  const lines = [
    '',
    '—',
    `${COMPANY_NAME} — Plateforme pour la restauration`,
  ];
  if (COMPANY_ADDRESS) lines.push(COMPANY_ADDRESS);
  lines.push(SUPPORT_EMAIL);
  lines.push('');
  lines.push(`Vous recevez cet email parce que vous avez un compte sur ${COMPANY_NAME}.`);
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Templates ───

export async function sendWelcomeEmail(to: string, restaurantName: string, slug: string) {
  const url = `https://${slug}.brizoapp.com/admin`;
  const subject = `Bienvenue sur BrizoApp — ${restaurantName} est prêt`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">Votre restaurant est prêt.</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">
        <strong>${escapeHtml(restaurantName)}</strong> est maintenant accessible sur BrizoApp.
        Vous pouvez configurer votre menu, tester la caisse et accueillir vos premiers clients.
      </p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Accéder à mon restaurant
      </a>
      <p style="font-size: 13px; color: #B0ADA6; margin-top: 24px; line-height: 1.6;">
        Votre adresse : <strong>${slug}.brizoapp.com</strong><br/>
        Essai gratuit : 10 jours<br/>
        Pas de carte bancaire requise.
      </p>
      ${footerHtml()}
    </div>
  `;
  const text = [
    `Votre restaurant est prêt.`,
    ``,
    `${restaurantName} est maintenant accessible sur BrizoApp. Vous pouvez configurer votre menu, tester la caisse et accueillir vos premiers clients.`,
    ``,
    `Accéder à mon restaurant : ${url}`,
    ``,
    `Votre adresse : ${slug}.brizoapp.com`,
    `Essai gratuit : 10 jours — pas de carte bancaire requise.`,
    footerText(),
  ].join('\n');
  await send(to, subject, html, text);
}

export async function sendTrialEndingSoonEmail(to: string, restaurantName: string, slug: string, daysLeft: number) {
  const url = `https://${slug}.brizoapp.com/admin/billing`;
  const subject = daysLeft <= 0
    ? `Votre essai BrizoApp est terminé — ${restaurantName}`
    : `Votre essai BrizoApp se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
  const headline = daysLeft <= 0 ? 'Votre essai est terminé.' : 'Votre essai se termine bientôt.';
  const body = daysLeft <= 0
    ? `L'essai gratuit de <strong>${escapeHtml(restaurantName)}</strong> est terminé. Votre accès à la caisse et aux commandes est limité. Souscrivez pour reprendre votre activité.`
    : `Il vous reste <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong> d'essai gratuit pour <strong>${escapeHtml(restaurantName)}</strong>. Pour continuer à utiliser votre caisse et vos commandes, choisissez un plan.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">${headline}</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">${body}</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Choisir mon plan
      </a>
      <p style="font-size: 13px; color: #B0ADA6; margin-top: 24px; line-height: 1.6;">
        Vos données sont conservées même après la fin de l'essai.
      </p>
      ${footerHtml()}
    </div>
  `;
  const textBody = daysLeft <= 0
    ? `L'essai gratuit de ${restaurantName} est terminé. Votre accès à la caisse et aux commandes est limité. Souscrivez pour reprendre votre activité.`
    : `Il vous reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai gratuit pour ${restaurantName}. Pour continuer à utiliser votre caisse et vos commandes, choisissez un plan.`;
  const text = [
    headline,
    ``,
    textBody,
    ``,
    `Choisir mon plan : ${url}`,
    ``,
    `Vos données sont conservées même après la fin de l'essai.`,
    footerText(),
  ].join('\n');
  await send(to, subject, html, text);
}

export async function sendPaymentSuccessEmail(to: string, restaurantName: string, amount: number, hostedInvoiceUrl?: string | null) {
  const subject = `Paiement confirmé — ${restaurantName}`;
  const invoiceBlockHtml = hostedInvoiceUrl
    ? `<a href="${hostedInvoiceUrl}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 8px;">Voir la facture</a>`
    : `<p style="font-size: 13px; color: #B0ADA6; line-height: 1.6;">Votre facture est disponible dans votre espace Stripe.</p>`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">Paiement confirmé.</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">
        Votre abonnement BrizoApp pour <strong>${escapeHtml(restaurantName)}</strong> est actif.
        Montant : <strong>${amount} €/mois</strong>.
      </p>
      ${invoiceBlockHtml}
      ${footerHtml()}
    </div>
  `;
  const text = [
    `Paiement confirmé.`,
    ``,
    `Votre abonnement BrizoApp pour ${restaurantName} est actif.`,
    `Montant : ${amount} €/mois.`,
    ``,
    hostedInvoiceUrl ? `Voir la facture : ${hostedInvoiceUrl}` : `Votre facture est disponible dans votre espace Stripe.`,
    footerText(),
  ].join('\n');
  await send(to, subject, html, text);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const subject = `Réinitialisation de votre mot de passe — BrizoApp`;
  const greeting = name ? `Bonjour ${escapeHtml(name)}, ` : 'Bonjour, ';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">Réinitialisation du mot de passe</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">
        ${greeting}une demande de réinitialisation a été faite pour votre compte.
        Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe. Le lien est valable 1 heure.
      </p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Choisir un nouveau mot de passe
      </a>
      <p style="font-size: 13px; color: #B0ADA6; margin-top: 24px; line-height: 1.6;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe actuel restera inchangé.
      </p>
      ${footerHtml()}
    </div>
  `;
  const text = [
    `Réinitialisation du mot de passe`,
    ``,
    `${name ? `Bonjour ${name},` : 'Bonjour,'} une demande de réinitialisation a été faite pour votre compte. Le lien est valable 1 heure.`,
    ``,
    `Choisir un nouveau mot de passe : ${resetUrl}`,
    ``,
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe actuel restera inchangé.`,
    footerText(),
  ].join('\n');
  await send(to, subject, html, text);
}

export async function sendEmployeeInviteEmail(
  to: string,
  params: { name: string; restaurantName: string; role: string; tempPassword: string; loginUrl: string; tempPasswordExpiresAt?: Date | null }
) {
  const { name, restaurantName, role, tempPassword, loginUrl, tempPasswordExpiresAt } = params;
  const subject = `Vous avez accès à ${restaurantName} — BrizoApp`;
  const expiryLineHtml = tempPasswordExpiresAt
    ? `Ce mot de passe temporaire expire le <strong>${tempPasswordExpiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
    : '';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">Bienvenue, ${escapeHtml(name)}.</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">
        Vous avez été ajouté à <strong>${escapeHtml(restaurantName)}</strong> sur BrizoApp avec le rôle <strong>${escapeHtml(role)}</strong>.
      </p>
      <div style="background: #FAFAF8; border: 1px solid #EDEBE7; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="font-size: 12px; color: #8A8A8A; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Mot de passe temporaire</p>
        <p style="font-size: 18px; color: #1A1A1A; margin: 0; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-weight: 600; letter-spacing: 0.05em;">${escapeHtml(tempPassword)}</p>
      </div>
      <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Se connecter
      </a>
      <p style="font-size: 13px; color: #B0ADA6; margin-top: 24px; line-height: 1.6;">
        À votre première connexion, vous devrez choisir un nouveau mot de passe. Ne partagez pas ce mot de passe temporaire.
        ${expiryLineHtml ? `<br/>${expiryLineHtml}` : ''}
      </p>
      ${footerHtml()}
    </div>
  `;
  const expiryLineText = tempPasswordExpiresAt
    ? `Ce mot de passe temporaire expire le ${tempPasswordExpiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : '';
  const text = [
    `Bienvenue, ${name}.`,
    ``,
    `Vous avez été ajouté à ${restaurantName} sur BrizoApp avec le rôle ${role}.`,
    ``,
    `Mot de passe temporaire : ${tempPassword}`,
    ``,
    `Se connecter : ${loginUrl}`,
    ``,
    `À votre première connexion, vous devrez choisir un nouveau mot de passe. Ne partagez pas ce mot de passe temporaire.`,
    expiryLineText,
    footerText(),
  ].filter(Boolean).join('\n');
  await send(to, subject, html, text);
}

export async function sendPaymentFailedEmail(to: string, restaurantName: string, slug: string) {
  const url = `https://${slug}.brizoapp.com/admin/billing`;
  const subject = `Problème de paiement — ${restaurantName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <img src="https://brizoapp.com/brizo-icon.svg" alt="BrizoApp" style="width: 40px; height: 40px; margin-bottom: 24px;" />
      <h1 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px;">Problème de paiement.</h1>
      <p style="font-size: 15px; color: #8A8A8A; line-height: 1.6; margin: 0 0 24px;">
        Le paiement pour <strong>${escapeHtml(restaurantName)}</strong> n'a pas pu être traité.
        Veuillez mettre à jour votre moyen de paiement pour éviter l'interruption du service.
      </p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #1A1A1A; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Mettre à jour le paiement
      </a>
      ${footerHtml()}
    </div>
  `;
  const text = [
    `Problème de paiement.`,
    ``,
    `Le paiement pour ${restaurantName} n'a pas pu être traité. Veuillez mettre à jour votre moyen de paiement pour éviter l'interruption du service.`,
    ``,
    `Mettre à jour le paiement : ${url}`,
    footerText(),
  ].join('\n');
  await send(to, subject, html, text);
}
