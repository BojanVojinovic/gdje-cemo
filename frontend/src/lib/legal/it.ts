import type { LegalBundle } from "@/lib/legal/types";

const it: LegalBundle = {
  privacy: {
    title: "Informativa sulla privacy",
    updated: "12 ottobre 2026",
    sections: [
      {
        heading: "Chi gestisce Shall We",
        body: [
          "Shall We è una guida a ristoranti, caffè e bar in Montenegro. Il sito è pubblicato su https://gdje-cemo.vercel.app.",
          "Le domande sui dati vanno a podrska@gdjecemo.me. A quell'indirizzo si chiede l'accesso, una correzione o la chiusura dell'account.",
        ],
      },
      {
        heading: "A che cosa servono i dati",
        body: [
          "Usiamo i dati personali per aprire e proteggere un account, ricordare la lingua scelta, passare una prenotazione, un ordine al tavolo o una consegna al locale, mostrare una recensione che hai scritto e avvisarti di un posto che segui.",
          "L'email parte solo per il codice di verifica, il recupero della password e il messaggio che una consegna è arrivata. Non c'è una newsletter e non c'è una lista di marketing.",
        ],
      },
      {
        heading: "Che cosa conserviamo",
        body: [
          "Un account tiene nome, cognome, nome utente, email, telefono se lo aggiungi e una password. La password è conservata in una forma che non si può rileggere. Puoi aggiungere una foto del profilo. Se un locale ti aggiunge al personale, conserviamo quel ruolo e i turni.",
          "Una prenotazione conserva il posto, l'orario, il numero di persone, il tavolo e una nota. Una consegna conserva indirizzo, città, telefono, nota e piatti. Una recensione conserva il voto e il testo, con il tuo nome su quel posto. I posti salvati e i seguiti stanno sull'account.",
          "Un ordine dal codice QR del tavolo non richiede un account. Resta legato a quel tavolo finché la visita non si chiude. Una segnalazione di una recensione o di un post conserva il motivo che hai indicato.",
        ],
      },
      {
        heading: "Chi altro li vede",
        body: [
          "Il locale, e il personale che serve a quel lavoro, vedono la prenotazione, l'ordine al tavolo o la consegna. Il cameriere vede la chiamata dal tavolo e la richiesta del conto. Cucina e bar vedono i piatti della propria postazione. La consegna vede l'indirizzo. Chi amministra la piattaforma vede le segnalazioni e gli account per far funzionare il sito.",
          "Non vendiamo nomi, email o telefoni. Non costruiamo profili pubblicitari per altre aziende e non consegniamo i dati per il loro marketing.",
          "Queste aziende trattano i dati solo per ospitare il sito, tenere il database, conservare le foto, inviare quelle poche email o mostrare un avviso dal vivo mentre il sito è aperto: Vercel, Render, Railway, Brevo e Pusher.",
        ],
      },
      {
        heading: "Per quanto tempo restano",
        body: [
          "L'account resta finché è aperto. Nome, email e telefono li cambi tu, e puoi cancellare la tua recensione.",
          "Per chiudere l'account scrivi a podrska@gdjecemo.me. Dopo la chiusura non è più possibile entrare. Il locale può tenere la prenotazione o l'ordine che gli è servito per servirti. Un codice di verifica scade dopo 30 minuti.",
        ],
      },
      {
        heading: "Il browser",
        body: [
          "Un cookie chiamato gdje-locale ricorda la lingua. La chiave di accesso resta in questo browser e non viene inviata ad altri siti. Non c'è un cookie pubblicitario, e il sito non chiede di accettare i cookie prima della lettura.",
        ],
      },
      {
        heading: "Le richieste",
        body: [
          "A podrska@gdjecemo.me puoi chiedere quali dati teniamo, una correzione o la chiusura dell'account.",
          "Puoi anche reclamare all'Agenzia per la protezione dei dati personali e il libero accesso alle informazioni del Montenegro, su azlp.me.",
        ],
      },
    ],
  },
  terms: {
    title: "Condizioni d'uso",
    updated: "12 ottobre 2026",
    sections: [
      {
        heading: "Il servizio",
        body: [
          "Shall We elenca locali in Montenegro e passa una prenotazione, un ordine al tavolo o una consegna a quel posto. Orari, menu e prezzi li scrive il locale. Shall We non prepara il pasto e non incassa. Chiedere il conto manda una richiesta al personale di quel locale.",
          "All'uso del sito si applica la legge del Montenegro.",
        ],
      },
      {
        heading: "Account",
        body: [
          "Apri un account con il tuo nome e la tua email e lo confermi con il codice che inviamo. La password resta tua. Aprire un account non chiede di spuntare una casella.",
          "Possiamo chiudere un account usato per ingannare, molestare o sovraccaricare il servizio. Un account chiuso non può più entrare.",
        ],
      },
      {
        heading: "Prenotazioni",
        body: [
          "Una prenotazione è una richiesta al locale. Il locale la conferma, sistema l'ospite, la rifiuta o la chiude. Finché è in attesa o confermata, puoi annullarla dal profilo. Se non c'è un tavolo libero, puoi metterti in lista d'attesa per quell'orario.",
        ],
      },
      {
        heading: "Ordini",
        body: [
          "Un codice QR sul tavolo apre solo quel tavolo. L'ordine va al locale. La pagina limita quanto può inviare una seduta, per non sommergere la cucina. Una consegna va alla cucina, al bar e al personale delle consegne di quel locale, e solo dove il locale offre la consegna.",
        ],
      },
      {
        heading: "Recensioni",
        body: [
          "Puoi lasciare una recensione su un posto, poi modificarla o cancellarla. Il locale può rispondere. Una recensione che è spam, molestia o un'affermazione falsa può essere nascosta.",
        ],
      },
      {
        heading: "Locali",
        body: [
          "Il pannello dell'attività si apre solo dopo che la piattaforma accetta la richiesta. Il titolare risponde di ciò che il posto pubblica e del personale che aggiunge. Il personale vede solo il lavoro del proprio ruolo in quel posto.",
          "Shall We non fa pagare gli ospiti. Un'attività sceglie un piano per questo pannello. Su questo sito il piano è un abbonamento di prova: non si chiede una carta e non si addebita nulla.",
        ],
      },
      {
        heading: "Modifiche e contatto",
        body: [
          "Quando queste condizioni cambiano, il nuovo testo esce su questa pagina con una nuova data. L'informativa sulla privacy è una pagina a parte.",
          "Scrivi a podrska@gdjecemo.me.",
        ],
      },
    ],
  },
};

export default it;
