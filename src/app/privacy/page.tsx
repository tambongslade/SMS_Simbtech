import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    "How St. Stephen's International College collects, uses, and protects personal information in the SSIC school management system.",
};

const LAST_UPDATED = '12 August 2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="SSIC Logo" width={40} height={40} priority />
            <span className="font-semibold text-gray-900">
              St. Stephen&apos;s International College
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <p>
              St. Stephen&apos;s International College (&ldquo;SSIC&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the school management
              system available at{' '}
              <span className="font-medium">ssiccmr.com</span> and its mobile
              applications (together, the &ldquo;Platform&rdquo;). This policy
              explains what personal information we collect through the
              Platform, why we collect it, who can see it, and the choices you
              have.
            </p>
            <p className="mt-3">
              By using the Platform you confirm that you have read this policy.
              If you do not agree with it, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Who this policy applies to
            </h2>
            <p>
              This policy covers everyone whose information is handled by the
              Platform, including:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Students enrolled at SSIC</li>
              <li>Parents and guardians of enrolled students</li>
              <li>Teaching and non-teaching staff</li>
              <li>School administrators and management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Information we collect
            </h2>
            <p>Depending on your role, we may hold the following:</p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-1">
              Student records
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Full name, matricule, date of birth, gender, photograph</li>
              <li>Class, sub-class and academic year enrolment</li>
              <li>
                Marks, sequence and term results, report cards and academic
                history
              </li>
              <li>
                Attendance, discipline records, nurse visit logs, and related
                notes
              </li>
              <li>Fee payments, outstanding balances and receipts</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-1">
              Parent and guardian records
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, phone number, WhatsApp number, email, address</li>
              <li>Emergency contact details</li>
              <li>Link to the student(s) under your care</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-1">
              Staff records
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, contact details, role(s) and academic-year assignments</li>
              <li>Timetable, class and subject assignments</li>
              <li>Login credentials and audit trail of actions performed</li>
              <li>Salary and payroll information (where applicable)</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-1">
              Technical information
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Device type, browser, IP address and approximate location, used
                for security and troubleshooting
              </li>
              <li>
                Push-notification tokens when you install our mobile app and
                opt in to notifications
              </li>
              <li>
                Server logs of authentication attempts and sensitive actions,
                used for audit purposes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Why we collect it
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To manage enrolment, academic progress and reporting</li>
              <li>
                To communicate with parents and students about results,
                attendance, discipline and school events
              </li>
              <li>To collect, record and reconcile school fees</li>
              <li>
                To operate day-to-day school administration (timetabling,
                staffing, health records)
              </li>
              <li>
                To keep the Platform secure and to investigate unauthorised
                access
              </li>
              <li>
                To comply with legal and regulatory obligations that apply to
                schools in Cameroon
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Who can see your information
            </h2>
            <p>
              The Platform enforces role-based access. In broad terms:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>
                <span className="font-medium">Parents</span> see only their own
                child(ren): profile, marks, attendance, discipline and fee
                status.
              </li>
              <li>
                <span className="font-medium">Students</span> see only their
                own academic and personal records.
              </li>
              <li>
                <span className="font-medium">Teachers</span> see the students
                in their assigned classes and subjects.
              </li>
              <li>
                <span className="font-medium">Bursars, Controllers and
                Auditors</span> see fee and payment information required for
                their work.
              </li>
              <li>
                <span className="font-medium">
                  Principals, Vice-Principals and Super Managers
                </span>{' '}
                have broad administrative access needed to run the school.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell personal information. We do not share information
              with third parties for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Third-party services we use
            </h2>
            <p>
              We rely on a small number of trusted providers to operate the
              Platform:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>
                <span className="font-medium">Hosting and database</span> —
                cloud infrastructure providers used to store data and serve the
                Platform.
              </li>
              <li>
                <span className="font-medium">Push notifications</span> — we
                use OneSignal to deliver in-app notifications (results
                published, fee reminders, announcements). OneSignal receives a
                device token; it does not receive your marks, fee balance or
                other school records.
              </li>
              <li>
                <span className="font-medium">Messaging channels</span> —
                where enabled, notifications may also be sent to you by SMS,
                email or WhatsApp using standard messaging providers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. How we protect your information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encrypted connections (HTTPS) for all Platform traffic</li>
              <li>
                Passwords are stored hashed; parent access uses the child&apos;s
                matricule and is scoped to that child&apos;s records only
              </li>
              <li>
                Session tokens are invalidated on logout and expire
                automatically
              </li>
              <li>
                Sensitive actions (fee entries, mark changes, deletions) are
                recorded in an audit trail
              </li>
              <li>
                Access is granted on a least-privilege basis, driven by the
                role assigned to each user for the current academic year
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. How long we keep information
            </h2>
            <p>
              Student academic records are retained for as long as SSIC needs
              them to serve the student and to produce transcripts, testimonials
              and other academic proofs after graduation. Fee and payment
              records are kept for the periods required by accounting and tax
              rules. Server and audit logs are kept for a shorter operational
              period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Your choices and rights
            </h2>
            <p>You can:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>
                Ask to see the personal information we hold about you or your
                child
              </li>
              <li>Ask us to correct information that is inaccurate</li>
              <li>
                Turn push notifications on or off from your device settings,
                and from the Settings screen inside the app
              </li>
              <li>
                Ask us to delete records that we are no longer required to keep
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us using the details in
              section 11 below. We may need to verify your identity before
              acting on the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Children&apos;s information
            </h2>
            <p>
              The Platform is designed for use inside a school. Where students
              are minors, we act on the instructions of the school and the
              student&apos;s parent or guardian. Parents can review their
              child&apos;s information at any time by signing in with the
              child&apos;s matricule.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time to reflect changes to
              the Platform, our practices, or the law. When we do, we will
              update the &ldquo;Last updated&rdquo; date at the top of this
              page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              11. Contact us
            </h2>
            <p>
              If you have questions about this policy or how your information
              is handled, please contact the school administration:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Email: info@ssiccmr.com</li>
              <li>Website: ssiccmr.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-white bg-blue-700 hover:bg-blue-800 text-sm font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} St. Stephen&apos;s International
        College. All rights reserved.
      </footer>
    </div>
  );
}
