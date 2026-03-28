interface Props {
  label: string;
  variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

export default function Badge({ label, variant }: Props) {
  return <span className={`badge badge-${variant}`}>{label}</span>;
}
