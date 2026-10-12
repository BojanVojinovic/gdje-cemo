import type { LegalBundle } from "@/lib/legal/types";

const en: LegalBundle = {
  privacy: {
    title: "Privacy policy",
    updated: "12 October 2026",
    sections: [
      {
        heading: "Who runs Shall We",
        body: [
          "Shall We is a guide to restaurants, cafés and bars in Montenegro. The site is published at https://gdje-cemo.vercel.app.",
          "Questions about your data go to podrska@gdjecemo.me. That is the address for access, correction and closing an account.",
        ],
      },
      {
        heading: "What the data is for",
        body: [
          "We use personal data to open and protect an account, remember the language you chose, pass a reservation, a table order or a delivery to the venue, show a review you wrote, and tell you about a place you follow.",
          "Email is sent only for the verification code, a password reset, and the message that a delivery has arrived. There is no newsletter and no marketing list.",
        ],
      },
      {
        heading: "What we store",
        body: [
          "An account holds your first name, last name, username, email, phone if you add one, and a password. The password is stored in a form that cannot be read back. You may add a profile photo. If a venue adds you to its staff, we store that role and your shifts.",
          "A reservation stores the place, time, number of guests, table and any note. A delivery stores the address, city, phone, note and the dishes. A review stores the rating and the text, with your name on that place. Saved places and follows sit on your account.",
          "An order from a table QR code does not need an account. It stays with that table until the visit is closed. A report of a review or a post stores the reason you gave.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "The venue, and the staff who need it for that job, see the reservation, the table order or the delivery. A waiter sees a table call and a bill request. Kitchen and bar see dishes for their station. Delivery staff see the address. The platform administrator sees reports and accounts in order to run the site.",
          "We do not sell names, email addresses or phone numbers. We do not build advertising profiles for other companies, and we do not pass your data to them for their own marketing.",
          "These companies process data only to host the site, keep the database, store photos, send those few emails, or deliver a live notification while you have the site open: Vercel, Render, Railway, Brevo and Pusher.",
        ],
      },
      {
        heading: "How long it stays",
        body: [
          "The account stays while it is open. You change your name, email and phone yourself, and you can delete your own review.",
          "To close the account, write to podrska@gdjecemo.me. After it is closed you can no longer sign in. The venue may keep the reservation or the order it needed in order to serve you. A verification code expires after 30 minutes.",
        ],
      },
      {
        heading: "The browser",
        body: [
          "A cookie named gdje-locale remembers the language. The sign-in key stays in this browser and is not sent to other websites. There is no advertising cookie, and the site does not ask you to accept cookies before you can read it.",
        ],
      },
      {
        heading: "Your requests",
        body: [
          "You can ask what we hold, ask for a correction, or ask us to close the account, at podrska@gdjecemo.me.",
          "You can also complain to the Agency for Personal Data Protection and Free Access to Information of Montenegro, at azlp.me.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    updated: "12 October 2026",
    sections: [
      {
        heading: "The service",
        body: [
          "Shall We lists places in Montenegro and passes a reservation, a table order or a delivery to that place. The venue writes its hours, menu and prices. Shall We does not prepare the meal and does not take payment. Asking for the bill sends a request to the staff of that venue.",
          "The law of Montenegro applies to the use of the site.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You open an account with your own name and email and confirm it with the code we send. You keep the password to yourself. Opening an account does not ask you to tick a box.",
          "We may close an account that is used to mislead, harass or overload the service. A closed account can no longer sign in.",
        ],
      },
      {
        heading: "Reservations",
        body: [
          "A reservation is a request to the venue. The venue confirms it, seats you, declines it or closes it. While it is pending or confirmed, you can cancel it from your profile. If the venue has no free table, you can join the waitlist for that time.",
        ],
      },
      {
        heading: "Orders",
        body: [
          "A QR code on a table opens that table only. The order goes to the venue. The page limits how much one sitting can send, so the kitchen is not flooded. A delivery goes to the kitchen, the bar and the delivery staff of that venue, and only where the venue offers delivery.",
        ],
      },
      {
        heading: "Reviews",
        body: [
          "You can leave one review on a place, then edit it or delete it. The venue can reply. A review that is spam, harassment or a false claim can be hidden.",
        ],
      },
      {
        heading: "Venues",
        body: [
          "A business panel opens only after the platform accepts the request. The owner is responsible for what the place publishes and for the staff they add. Staff see only the work of their role at that place.",
          "Guests are not charged by Shall We. A business chooses a plan for this panel. On this site that plan is a test subscription: no card is taken and nothing is charged.",
        ],
      },
      {
        heading: "Changes and contact",
        body: [
          "When these terms change, the new text is published on this page with a new date. The privacy policy is a separate page.",
          "Write to podrska@gdjecemo.me.",
        ],
      },
    ],
  },
};

export default en;
