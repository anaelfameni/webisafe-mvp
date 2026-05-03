// src/utils/knownSites.js

export const KNOWN_LARGE_SITES = [
    // --- TOP IVOIRIEN (LES 20 AJOUTÉS) ---
    'abidjan.net', 'pressecotedivoire.ci', 'fratmat.info', 'yeclo.com', 'koaci.com', // Médias & Actu
    'gouv.ci', 'service-public.gouv.ci', 'impots.gouv.ci', 'education.gouv.ci', 'sante.gouv.ci', // Institutions
    'betclic.ci', 'sportcash.ci', 'lonaci.ci', '1win.ci', // Betting & Jeux
    'cie.ci', 'sodeci.ci', 'aircoteivoire.com', // Services Publics & Transport
    'nsia.ci', 'cicash.ci', 'banqueatlantique.ci', // Finance & Assurances local

    // --- TES 20 ORIGINAUX ---
    'apple.com', 'google.com', 'amazon.com', 'facebook.com', 'microsoft.com',
    'stripe.com', 'netflix.com', 'twitter.com', 'x.com', 'linkedin.com',
    'youtube.com', 'instagram.com', 'jumia.com', 'jumia.ci', 'orange.ci',
    'mtn.ci', 'moov.ci', 'cinetpay.com', 'wave.com', 'freemobile.fr',

    // --- TECH, CLOUD & DEV ---
    'github.com', 'gitlab.com', 'bitbucket.org', 'vercel.com', 'netlify.com',
    'heroku.com', 'digitalocean.com', 'aws.amazon.com', 'azure.com', 'cloud.google.com',
    'cloudflare.com', 'akamai.com', 'fastly.com', 'stackexchange.com', 'stackoverflow.com',
    'docker.com', 'kubernetes.io', 'terraform.io', 'mongodb.com', 'postgresql.org',
    'redis.io', 'elastic.co', 'sentry.io', 'datadoghq.com', 'newrelic.com',
    'atlassian.com', 'jira.com', 'confluence.com', 'slack.com', 'discord.com',
    'zoom.us', 'microsoftteams.com', 'webex.com', 'openai.com', 'anthropic.com',
    'huggingface.co', 'nvidia.com', 'intel.com', 'amd.com', 'ibm.com',
    'oracle.com', 'salesforce.com', 'hubspot.com', 'zendesk.com', 'intercom.com',
    'mailchimp.com', 'sendgrid.com', 'twilio.com', 'auth0.com', 'okta.com',

    // --- E-COMMERCE, RETAIL & LOGISTIQUE ---
    'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com', 'homedepot.com',
    'aliexpress.com', 'alibaba.com', 'tmall.com', 'jd.com', 'rakuten.co.jp',
    'shopify.com', 'magento.com', 'woo.com', 'etsy.com', 'pinduoduo.com',
    'leboncoin.fr', 'cdiscount.com', 'fnac.com', 'darty.com', 'backmarket.fr',
    'vente-privee.com', 'showroomprive.com', 'zalando.fr', 'asps.com', 'zara.com',
    'hm.com', 'nike.com', 'adidas.com', 'shein.com', 'temu.com',
    'ikea.com', 'decathlon.fr', 'carrefour.fr', 'leroymerlin.fr', 'sephora.fr',
    'fedex.com', 'ups.com', 'dhl.com', 'usps.com', 'laposte.fr',

    // --- FINTECH, BANQUE & CRYPTO ---
    'paypal.com', 'venmo.com', 'cash.app', 'revolut.com', 'wise.com',
    'payoneer.com', 'skrill.com', 'klarna.com', 'affirm.com', 'afterpay.com',
    'binance.com', 'coinbase.com', 'kraken.com', 'kucoin.com', 'crypto.com',
    'metamask.io', 'etherscan.io', 'blockchain.com', 'opensea.io', 'ledger.com',
    'bnpparibas.com', 'societegenerale.fr', 'boursorama.com', 'credit-agricole.fr', 'labanquepostale.fr',
    'ca-nextbank.ch', 'ubs.com', 'credit-suisse.com', 'hsbc.com', 'barclays.com',
    'goldmansachs.com', 'jpmorganchase.com', 'ecobank.com', 'ubagroup.com', 'gtbank.com',
    'standardchartered.com', 'westernunion.com', 'moneygram.com', 'worldremit.com', 'remitly.com',

    // --- MÉDIAS, CONTENU & DIVERTISSEMENT ---
    'wikipedia.org', 'fandom.com', 'quora.com', 'reddit.com', 'medium.com',
    'nytimes.com', 'cnn.com', 'bbc.co.uk', 'reuters.com', 'bloomberg.com',
    'forbes.com', 'wsj.com', 'theguardian.com', 'huffpost.com', 'buzzfeed.com',
    'lemonde.fr', 'lefigaro.fr', 'liberation.fr', 'lequipe.fr', 'bfmtv.com',
    'jeuneafrique.com', 'france24.com', 'rfi.fr', 'bbc.com/afrique', 'aljazeera.com',
    'spotify.com', 'deezer.com', 'soundcloud.com', 'tidal.com', 'apple.com/apple-music',
    'twitch.tv', 'vimeo.com', 'dailymotion.com', 'hulu.com', 'disneyplus.com',
    'hbomax.com', 'paramountplus.com', 'crunchyroll.com', 'ign.com', 'gamespot.com',

    // --- VOYAGES & SERVICES LOCAUX ---
    'booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com', 'hotels.com',
    'trivago.fr', 'kayak.com', 'skyscanner.net', 'uber.com', 'lyft.com',
    'bolt.eu', 'grab.com', 'yandex.com', 'glovoapp.com', 'ubereats.com',
    'deliveroo.fr', 'just-eat.fr', 'trip.com', 'agoda.com', 'blablacar.fr',
    'sncf-connect.com', 'airfrance.fr', 'emirates.com', 'qatarairways.com', 'lufthansa.com',
    'doctolib.fr', 'ameli.fr', 'impots.gouv.fr', 'service-public.fr',

    // --- RÉSEAUX SOCIAUX & OUTILS DIVERS ---
    'tiktok.com', 'snapchat.com', 'pinterest.com', 'tumblr.com', 'flickr.com',
    'behance.net', 'dribbble.com', 'deviantart.com', 'goodreads.com', 'letterboxd.com',
    'telegram.org', 'whatsapp.com', 'signal.org', 'wechat.com', 'line.me',
    'canva.com', 'figma.com', 'notion.so', 'trello.com', 'monday.com',
    'asana.com', 'evernote.com', 'dropbox.com', 'box.com', 'wetransfer.com',
    'bitly.com', 'tinyurl.com', 'archive.org', 'issuu.com',

    // --- AUTRES / SÉCURITÉ / BROWSERS ---
    'mozilla.org', 'opera.com', 'brave.com', 'torproject.org', 'duckduckgo.com',
    'bing.com', 'yahoo.com', 'baidu.com', 'naver.com', 'yandex.ru',
    'speedtest.net', 'fast.com', 'virustotal.com', 'shodan.io', 'exploit-db.com'
];

export function isKnownLargeSite(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return KNOWN_LARGE_SITES.some((site) => hostname === site || hostname.endsWith('.' + site));
    } catch {
        return false;
    }
}

export function getLargeSiteDisclaimer(score) {
    if (score >= 75) return null; // Pas besoin si le score est bon
    return {
        title: "Pourquoi ce score ?",
        message:
            "Les grandes entreprises obtiennent parfois un score inférieur aux attentes " +
            "car elles optimisent leur site pour leur propre audience " +
            "et non pour les critères standards. " +
            "Ce score reflète les meilleures pratiques générales du web, " +
            "et pas nécessairement la réalité vécue par leurs utilisateurs.",
    };
}