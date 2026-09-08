import Link from "next/link";

export default function RootPage() {
  return (
    <main>
      <h1>TFT Community App — Admin</h1>
      <p>Placeholder root page.</p>
      <ul>
        <li>
          <Link href="/login">Login</Link>
        </li>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link href="/members">Members</Link>
        </li>
        <li>
          <Link href="/groups">Groups</Link>
        </li>
      </ul>
    </main>
  );
}
