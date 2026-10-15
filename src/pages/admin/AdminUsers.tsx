import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Role } from '../../types';
import { useApp } from '../../context/AppContext';
import { Button, Card, DemoNote, Field, Modal, PageHeader, StatusBadge, Table, Td, inputClass } from '../../components/ui';
import { createStaffUser, setUserActive, type UserInput } from '../../services/authService';
import { humanize } from '../../utils/format';

const blank: UserInput = { name: '', email: '', phone: '', password: '', role: 'OPERATOR', stationId: '' };

export default function AdminUsers() {
  const { state, user, run } = useApp();
  const [form, setForm] = useState<UserInput | null>(null);
  const submit = () => { if (form && run((s) => createStaffUser(s, form), `${humanize(form.role)} account created.`)) setForm(null); };
  const set = (k: keyof UserInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => form && setForm({ ...form, [k]: e.target.value } as UserInput);

  return (
    <>
      <PageHeader title="Manage Users" subtitle="Create staff accounts and activate or deactivate any account."
        actions={<Button onClick={() => setForm({ ...blank, stationId: state.stations[0]?.id })}><Plus className="h-4 w-4" />Add staff user</Button>} />
      <div className="mb-4"><DemoNote>EV owners register themselves on the login page. Deactivated users can no longer log in.</DemoNote></div>
      <Card>
        <Table headers={['Name', 'Email', 'Phone', 'Role', 'Station', 'Status', '']}>
          {state.users.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td><Td>{u.email}</Td><Td>{u.phone}</Td><Td>{humanize(u.role)}</Td>
              <Td>{u.stationId ? state.stations.find((s) => s.id === u.stationId)?.name : '—'}</Td>
              <Td><StatusBadge status={u.active ? 'OPEN' : 'CLOSED'} /></Td>
              <Td>{u.id !== user!.id && (
                <Button size="sm" variant="secondary" onClick={() => run((s) => setUserActive(s, u.id, !u.active, user!.id), `${u.name} ${u.active ? 'deactivated' : 'activated'}.`)}>
                  {u.active ? 'Deactivate' : 'Activate'}</Button>)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title="Add staff user">
        {form && (
          <div className="space-y-4">
            <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} /></Field>
            <Field label="Email"><input className={inputClass} value={form.email} onChange={set('email')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mobile (10 digits)"><input className={inputClass} maxLength={10} value={form.phone} onChange={set('phone')} /></Field>
              <Field label="Password (min 6)"><input type="password" className={inputClass} value={form.password} onChange={set('password')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="OPERATOR">Station operator</option><option value="ADMIN">Administrator</option></select></Field>
              {form.role === 'OPERATOR' && <Field label="Station"><select className={inputClass} value={form.stationId} onChange={set('stationId')}>
                {state.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
            </div>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={submit}>Create user</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
