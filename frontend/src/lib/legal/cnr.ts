import type { LegalBundle } from "@/lib/legal/types";

const cnr: LegalBundle = {
  privacy: {
    title: "Pravila privatnosti",
    updated: "12. oktobar 2026.",
    sections: [
      {
        heading: "Ko vodi Shall We",
        body: [
          "Shall We je vodič kroz restorane, kafiće i barove u Crnoj Gori. Sajt je objavljen na https://gdje-cemo.vercel.app.",
          "Pitanja o podacima idu na podrska@gdjecemo.me. Na tu adresu stiže i zahtjev za uvid, ispravku i zatvaranje naloga.",
        ],
      },
      {
        heading: "Čemu podaci služe",
        body: [
          "Lične podatke koristimo da otvorimo i čuvamo nalog, zapamtimo izabrani jezik, prenesemo rezervaciju, narudžbinu sa stola ili dostavu lokalu, prikažemo recenziju koju ste napisali i javimo vam novosti mjesta koje pratite.",
          "Email ide samo za kod potvrde naloga, oporavak lozinke i poruku da je dostava stigla. Nema biltena i nema marketinške liste.",
        ],
      },
      {
        heading: "Šta čuvamo",
        body: [
          "Nalog drži ime, prezime, korisničko ime, email, telefon ako ga dodate, i lozinku. Lozinka se čuva u obliku iz kojeg se ne može pročitati. Možete dodati fotografiju profila. Ako vas lokal doda u osoblje, čuvamo tu ulogu i smjene.",
          "Rezervacija čuva mjesto, vrijeme, broj gostiju, sto i napomenu. Dostava čuva adresu, grad, telefon, napomenu i jela. Recenzija čuva ocjenu i tekst, uz vaše ime na tom mjestu. Sačuvana mjesta i praćenje stoje na nalogu.",
          "Narudžbina preko QR koda na stolu ne traži nalog. Ostaje uz taj sto dok se posjeta ne zatvori. Prijava recenzije ili objave čuva razlog koji ste naveli.",
        ],
      },
      {
        heading: "Ko još vidi podatke",
        body: [
          "Lokal, i osoblje kojem taj posao treba, vide rezervaciju, narudžbinu sa stola ili dostavu. Konobar vidi poziv sa stola i zahtjev za račun. Kuhinja i šank vide jela svoje stanice. Dostavljač vidi adresu. Administrator platforme vidi prijave i naloge da bi vodio sajt.",
          "Ne prodajemo imena, email adrese ni telefone. Ne pravimo reklamne profile za druge firme i ne predajemo im podatke za njihov marketing.",
          "Ove firme obrađuju podatke samo da ugoste sajt, drže bazu, čuvaju fotografije, pošalju tih nekoliko emailova ili dostave iskačuću poruku dok je sajt otvoren: Vercel, Render, Railway, Brevo i Pusher.",
        ],
      },
      {
        heading: "Koliko dugo ostaju",
        body: [
          "Nalog ostaje dok je otvoren. Ime, email i telefon mijenjate sami, a svoju recenziju možete obrisati.",
          "Da zatvorite nalog, pišete na podrska@gdjecemo.me. Poslije zatvaranja prijava više ne prolazi. Lokal može zadržati rezervaciju ili narudžbinu koja mu je trebala da vas usluži. Kod potvrde važi 30 minuta.",
        ],
      },
      {
        heading: "Pregledač",
        body: [
          "Kolačić gdje-locale pamti jezik. Ključ prijave ostaje u ovom pregledaču i ne šalje se drugim sajtovima. Nema reklamnog kolačića, i sajt ne traži prihvatanje kolačića prije čitanja.",
        ],
      },
      {
        heading: "Zahtjevi",
        body: [
          "Na podrska@gdjecemo.me možete tražiti uvid u ono što držimo, ispravku, ili zatvaranje naloga.",
          "Žalbu možete uputiti i Agenciji za zaštitu ličnih podataka i slobodan pristup informacijama Crne Gore, na azlp.me.",
        ],
      },
    ],
  },
  terms: {
    title: "Uslovi korišćenja",
    updated: "12. oktobar 2026.",
    sections: [
      {
        heading: "Usluga",
        body: [
          "Shall We navodi mjesta u Crnoj Gori i prenosi rezervaciju, narudžbinu sa stola ili dostavu tom mjestu. Radno vrijeme, meni i cijene upisuje lokal. Shall We ne sprema jelo i ne naplaćuje. Zahtjev za račun ide osoblju tog lokala.",
          "Na korišćenje sajta primjenjuje se pravo Crne Gore.",
        ],
      },
      {
        heading: "Nalozi",
        body: [
          "Nalog otvarate svojim imenom i emailom i potvrđujete ga kodom koji pošaljemo. Lozinku čuvate za sebe. Otvaranje naloga ne traži kvačicu.",
          "Nalog koji se koristi da zavara, uznemirava ili preoptereti servis možemo zatvoriti. Zatvoren nalog se više ne prijavljuje.",
        ],
      },
      {
        heading: "Rezervacije",
        body: [
          "Rezervacija je zahtjev lokalu. Lokal je potvrđuje, smješta gosta, odbija je ili je zatvara. Dok je na čekanju ili potvrđena, možete je otkazati sa profila. Ako nema slobodnog stola, možete stati na listu čekanja za taj termin.",
        ],
      },
      {
        heading: "Narudžbine",
        body: [
          "QR kod na stolu otvara samo taj sto. Narudžbina ide lokalu. Stranica ograničava koliko jedno sjedenje može poslati, da se kuhinja ne zatrpa. Dostava ide kuhinji, šanku i dostavljaču tog lokala, i samo tamo gdje lokal dostavu nudi.",
        ],
      },
      {
        heading: "Recenzije",
        body: [
          "Na jedno mjesto možete ostaviti jednu recenziju, pa je izmijeniti ili obrisati. Lokal može odgovoriti. Recenzija koja je spam, uznemiravanje ili netačna tvrdnja može biti sakrivena.",
        ],
      },
      {
        heading: "Lokali",
        body: [
          "Biznis panel se otvara tek kad platforma prihvati zahtjev. Vlasnik odgovara za ono što mjesto objavi i za osoblje koje doda. Osoblje vidi samo posao svoje uloge na tom mjestu.",
          "Goste Shall We ne naplaćuje. Biznis bira paket za ovaj panel. Na ovom sajtu taj paket je test pretplata: kartica se ne uzima i ništa se ne naplaćuje.",
        ],
      },
      {
        heading: "Izmjene i kontakt",
        body: [
          "Kad se ovi uslovi promijene, novi tekst izlazi na ovoj stranici sa novim datumom. Pravila privatnosti su zasebna stranica.",
          "Pišite na podrska@gdjecemo.me.",
        ],
      },
    ],
  },
};

export default cnr;
