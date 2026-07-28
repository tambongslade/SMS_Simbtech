export const metadata = {
  title: "Privacy Policy - St Stephens International College",
  description:
    "Privacy Policy for the St Stephens International College school management app.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-1">
          App: St Stephens International College
        </p>
        <p className="text-sm text-gray-500 mb-1">
          Developer: Tambong Kersten
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Effective date: June 29, 2026
        </p>

        <section className="space-y-6 leading-relaxed">
          <p>
            This Privacy Policy applies to the{" "}
            <strong>St Stephens International College</strong> mobile and web
            application (the &quot;App&quot; or &quot;Service&quot;), published
            on Google Play by developer <strong>Tambong Kersten</strong> on
            behalf of St Stephens International College. In this policy,
            &quot;we&quot;, &quot;our&quot;, and &quot;us&quot; refer to
            Tambong Kersten and St Stephens International College. This page
            informs you of our policies regarding the collection, use, and
            disclosure of personal data when you use the App and the choices
            you have associated with that data.
          </p>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect information that the school, administrators, teachers,
              parents, and students provide when using the App, including:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                Account information (name, email, phone number, role, password)
              </li>
              <li>
                Academic information (classes, subjects, marks, attendance,
                behavior records)
              </li>
              <li>Financial information (fee payments, transaction records)</li>
              <li>
                Communication data (messages, announcements, notifications)
              </li>
              <li>Device and usage data (IP address, browser type, log data)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>To provide and maintain the App</li>
              <li>To authenticate users and protect accounts</li>
              <li>To manage academic records, attendance, and fees</li>
              <li>To communicate with users about updates and notifications</li>
              <li>To improve the App and develop new features</li>
              <li>To comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share information
              with:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                Authorized school staff in accordance with their assigned role
              </li>
              <li>
                Service providers who help us operate the App (hosting,
                analytics, email delivery)
              </li>
              <li>
                Legal authorities when required by law or to protect our rights
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
            <p>
              We use industry-standard security measures to protect your data,
              including encrypted transmission (HTTPS), secure authentication,
              and access controls. However, no method of transmission over the
              Internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
            <p>
              We retain personal data for as long as your account is active or
              as needed to provide the App and comply with legal obligations.
              You may request deletion of your data at any time by contacting
              us.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              6. Children&apos;s Privacy
            </h2>
            <p>
              The App is designed for use by the school and may include data
              about students under 18. We collect such data only with the
              authorization of the school and parents/guardians as appropriate,
              and we do not use it for advertising.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal
              information. Contact the school administrator or us directly to
              exercise these rights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the &quot;Effective date&quot; above.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy for the{" "}
              <strong>St Stephens International College</strong> app, contact
              us at:
            </p>
            <p className="mt-2">
              Developer: Tambong Kersten
              <br />
              School: St Stephens International College
              <br />
              Email:{" "}
              <a
                href="mailto:tambongkersten7@gmail.com"
                className="text-blue-600 hover:underline"
              >
                tambongkersten7@gmail.com
              </a>
              <br />
              Website:{" "}
              <a
                href="https://ssiccmr.com"
                className="text-blue-600 hover:underline"
              >
                ssiccmr.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
