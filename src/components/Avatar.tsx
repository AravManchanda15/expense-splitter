import type { Person } from '../types';

export default function Avatar({
  person,
  size = 34,
}: {
  person: Person;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      title={person.name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: person.color,
      }}
    >
      {person.initials}
    </span>
  );
}
