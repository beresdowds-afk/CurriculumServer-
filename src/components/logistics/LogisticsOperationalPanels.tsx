import React, { useCallback, useEffect, useState } from 'react';
import { unifiedApiClient } from '../../services/unifiedApiClient';

type Envelope<T> = { success: true; data: T };
type RouteStop = { id: string; name: string; order: number };
type Route = { id: string; name: string; status: string; stops: RouteStop[] };
type Driver = { id: string; fullName: string; licenceValidUntil: string; qualified: boolean; status: string };
type Vehicle = {
  id: string; registration: string; capacity: number; approved: boolean; status: string;
  inspectionValidUntil: string; insuranceValidUntil: string;
};
type Trip = {
  id: string; routeId: string; driverId: string | null; vehicleId: string | null;
  status: string; tripDate: string; departureAt: string; arrivalAt: string;
};
type StudentRoute = { id: string; routeId: string; pickupStopId: string; dropoffStopId: string; startsOn: string; endsOn: string | null };
type Allocation = {
  id: string; studentId: string; bedId: string; bedNumber: string; roomNumber: string;
  buildingId: string; endedAt: string | null;
};
type RegisterRecord = { studentId: string; id: string | null; status: string; recordedAt: string | null };
type Meal = {
  id: string; diningHall: string; serviceDate: string; servicePeriod: string;
  startsAt: string; endsAt: string; attendanceCount: number;
};
type Page<T> = { data: T[] };

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error &&
      typeof error.error === 'string') return error.error;
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = '', ...inputProps } = props;
  return (
    <label className="block text-xs font-semibold text-slate-300">
      {label}
      <input {...inputProps}
        className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal ${className}`} />
    </label>
  );
}

function OperationsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function useOperationFeedback() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = useCallback(async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      return true;
    } catch (reason) {
      setError(message(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const status = (
    <>
      {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">{notice}</p>}
    </>
  );
  return { busy, run, status };
}

function idempotencyHeaders() {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

export function BoardingOperationsPanel({ authenticated, role }: { authenticated: boolean; role: string }) {
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [buildingName, setBuildingName] = useState('');
  const [buildingCapacity, setBuildingCapacity] = useState('');
  const [roomBuildingId, setRoomBuildingId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomFloor, setRoomFloor] = useState('');
  const [roomWing, setRoomWing] = useState('');
  const [bedRoomId, setBedRoomId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [bedId, setBedId] = useState('');
  const [registerBuildingId, setRegisterBuildingId] = useState('');
  const [registerStudentId, setRegisterStudentId] = useState('');
  const [registerKind, setRegisterKind] = useState<'evening' | 'curfew'>('evening');
  const [registerStatus, setRegisterStatus] = useState<'present' | 'absent' | 'excused' | 'unaccounted'>('present');
  const [registerDate, setRegisterDate] = useState(new Date().toISOString().slice(0, 10));
  const [registerRecords, setRegisterRecords] = useState<RegisterRecord[]>([]);
  const [transferStudentId, setTransferStudentId] = useState('');
  const [transferBedId, setTransferBedId] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [staffRole, setStaffRole] = useState<'housemaster' | 'assistant'>('housemaster');
  const [staffAssignmentId, setStaffAssignmentId] = useState('');
  const [latestRecordId, setLatestRecordId] = useState('');
  const [loadError, setLoadError] = useState('');
  const feedback = useOperationFeedback();
  const canManage = ['tenant_admin', 'principal', 'housemaster'].includes(role);
  const refresh = useCallback(async () => {
    if (!authenticated) {
      setBuildings([]);
      setAllocations([]);
      setRegisterRecords([]);
      setLoadError('');
      return;
    }
    const [occupancyResponse, allocationsResponse] = await Promise.all([
      unifiedApiClient.requestLogistics<Envelope<Array<{ id: string; name: string }>>>('/occupancy'),
      unifiedApiClient.requestLogistics<Envelope<{ items: Allocation[] }>>('/hostel/allocations?page=1&pageSize=100')
    ]);
    setBuildings(occupancyResponse.data);
    setAllocations(allocationsResponse.data.items);
    setLoadError('');
  }, [authenticated]);
  useEffect(() => { void refresh().catch(reason => setLoadError(message(reason))); }, [refresh]);

  const submit = async (event: React.FormEvent, action: () => Promise<{ id?: string; allocationId?: string }>, success: string) => {
    event.preventDefault();
    const ok = await feedback.run(async () => {
      const result = await action();
      const id = result.id || result.allocationId;
      if (id) setLatestRecordId(id);
      await refresh();
    }, success);
    if (ok) setStudentId('');
  };

  return (
    <div className="space-y-4">
      {feedback.status}
      {loadError && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{loadError}</p>}
      {canManage && (
        <div className="grid gap-4 xl:grid-cols-3">
          <OperationsPanel title="Hostel facilities">
            <form className="space-y-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>('/hostel/buildings', {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ name: buildingName, approvedCapacity: Number(buildingCapacity) })
              }).then(response => response.data), 'Hostel building created.')}>
              <TextInput required label="Building name" value={buildingName} onChange={event => setBuildingName(event.target.value)} />
              <TextInput required label="Approved capacity" type="number" min="0" step="1" value={buildingCapacity} onChange={event => setBuildingCapacity(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Create building</button>
            </form>
            <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>('/hostel/rooms', {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ buildingId: roomBuildingId, roomNumber, capacity: Number(roomCapacity), floor: roomFloor, wing: roomWing })
              }).then(response => response.data), 'Room created.')}>
              <label className="block text-xs font-semibold text-slate-300">Building
                <select required value={roomBuildingId} onChange={event => setRoomBuildingId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Select a building</option>
                  {buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <TextInput required label="Room number" value={roomNumber} onChange={event => setRoomNumber(event.target.value)} />
                <TextInput required label="Room capacity" type="number" min="1" step="1" value={roomCapacity} onChange={event => setRoomCapacity(event.target.value)} />
                <TextInput label="Floor" value={roomFloor} onChange={event => setRoomFloor(event.target.value)} />
                <TextInput label="Wing" value={roomWing} onChange={event => setRoomWing(event.target.value)} />
              </div>
              <button disabled={feedback.busy || !buildings.length} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Create room</button>
            </form>
            <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>('/hostel/beds', {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ roomId: bedRoomId, bedNumber })
              }).then(response => response.data), 'Bed space created.')}>
              <TextInput required label="Room ID" value={bedRoomId} onChange={event => setBedRoomId(event.target.value)} />
              <TextInput required label="Bed number" value={bedNumber} onChange={event => setBedNumber(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Create bed space</button>
            </form>
            {latestRecordId && <p className="break-all text-xs text-slate-400">Latest created record ID: {latestRecordId}</p>}
          </OperationsPanel>

          <OperationsPanel title="Student allocation and staff">
            <form className="space-y-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ allocationId: string }>>('/hostel/allocations', {
                method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ studentId, bedId })
              }).then(response => response.data), 'Student allocated to bed.')}>
              <TextInput required label="Student ID" value={studentId} onChange={event => setStudentId(event.target.value)} />
              <TextInput required label="Bed ID" value={bedId} onChange={event => setBedId(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Allocate bed</button>
            </form>
            <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ allocationId: string }>>('/hostel/transfers', {
                method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ studentId: transferStudentId, toBedId: transferBedId })
              }).then(response => response.data), 'Student transfer recorded.')}>
              <TextInput required label="Student ID to transfer" value={transferStudentId} onChange={event => setTransferStudentId(event.target.value)} />
              <TextInput required label="Destination bed ID" value={transferBedId} onChange={event => setTransferBedId(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Transfer student</button>
            </form>
            <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>('/hostel/assignments', {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ buildingId: registerBuildingId, userId: staffUserId, role: staffRole })
              }).then(response => response.data), 'Hostel staff assignment recorded.')}>
              <label className="block text-xs font-semibold text-slate-300">Building
                <select required value={registerBuildingId} onChange={event => setRegisterBuildingId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Select a building</option>
                  {buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}
                </select>
              </label>
              <TextInput required label="Staff user ID" value={staffUserId} onChange={event => setStaffUserId(event.target.value)} />
              <label className="block text-xs font-semibold text-slate-300">Assignment
                <select value={staffRole} onChange={event => setStaffRole(event.target.value as typeof staffRole)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="housemaster">Housemaster</option><option value="assistant">Assistant</option>
                </select>
              </label>
              <button disabled={feedback.busy || !buildings.length} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Assign staff</button>
            </form>
            <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>(
                `/hostel/assignments/${encodeURIComponent(staffAssignmentId)}/revoke`,
                { method: 'POST', headers: idempotencyHeaders() }
              ).then(response => response.data), 'Hostel staff assignment revoked.')}>
              <TextInput required label="Assignment ID to revoke" value={staffAssignmentId} onChange={event => setStaffAssignmentId(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Revoke assignment</button>
            </form>
          </OperationsPanel>

          <OperationsPanel title="Evening and curfew roll call">
            <button type="button" disabled={feedback.busy || !registerBuildingId} onClick={() => void feedback.run(async () => {
              const response = await unifiedApiClient.requestLogistics<Envelope<RegisterRecord[]>>(
                `/hostel/register?buildingId=${encodeURIComponent(registerBuildingId)}&kind=${registerKind}&serviceDate=${encodeURIComponent(registerDate)}`
              );
              setRegisterRecords(response.data);
            }, 'Roll-call register loaded.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">
              Load building register
            </button>
            {registerRecords.map(record => (
              <p key={record.studentId} className="rounded border border-slate-800 p-2 text-xs">
                Student {record.studentId} · {record.status}
                {record.recordedAt ? ` · ${new Date(record.recordedAt).toLocaleString()}` : ' · No record'}
              </p>
            ))}
            <form className="space-y-3" onSubmit={event => void submit(event, () =>
              unifiedApiClient.requestLogistics<Envelope<{ id: string }>>('/hostel/register', {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ kind: registerKind, studentId: registerStudentId, serviceDate: registerDate, status: registerStatus })
              }).then(response => response.data), 'Roll-call record saved.')}>
              <label className="block text-xs font-semibold text-slate-300">Building
                <select required value={registerBuildingId} onChange={event => setRegisterBuildingId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Select a building</option>
                  {buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}
                </select>
              </label>
              <TextInput required label="Student ID" value={registerStudentId} onChange={event => setRegisterStudentId(event.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-slate-300">Register
                  <select value={registerKind} onChange={event => setRegisterKind(event.target.value as typeof registerKind)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="evening">Evening</option><option value="curfew">Curfew</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-300">Status
                  <select value={registerStatus} onChange={event => setRegisterStatus(event.target.value as typeof registerStatus)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                    <option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option><option value="unaccounted">Unaccounted</option>
                  </select>
                </label>
              </div>
              <TextInput required label="Service date" type="date" value={registerDate} onChange={event => setRegisterDate(event.target.value)} />
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Save roll call</button>
            </form>
          </OperationsPanel>
        </div>
      )}
      <OperationsPanel title="Current and historical bed allocations">
        {allocations.length === 0 ? <p className="text-sm text-slate-400">No allocations are available.</p> : allocations.map(item => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 p-3 text-xs">
            <span>Student {item.studentId} · {item.roomNumber} / bed {item.bedNumber} · {item.endedAt ? 'Ended' : 'Active'}</span>
            {!item.endedAt && canManage && <button type="button" onClick={() => void feedback.run(async () => {
              await unifiedApiClient.requestLogistics(`/hostel/allocations/${encodeURIComponent(item.id)}/vacate`, { method: 'POST', headers: idempotencyHeaders() });
              await refresh();
            }, 'Bed allocation ended.')} className="rounded bg-slate-800 px-2 py-1">Discharge</button>}
          </article>
        ))}
      </OperationsPanel>
    </div>
  );
}

export function DiningOperationsPanel({ authenticated, role }: { authenticated: boolean; role: string }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [entitlements, setEntitlements] = useState<Array<{
    id: string; studentId: string; mealPeriods: string[]; startsOn: string; endsOn: string | null; status: string;
  }>>([]);
  const [dietaryList, setDietaryList] = useState<Array<{
    id: string; studentId: string; restriction: string; startsOn: string; endsOn: string | null; revokedAt?: string | null;
  }>>([]);
  const [loadError, setLoadError] = useState('');
  const [diningHall, setDiningHall] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [servicePeriod, setServicePeriod] = useState('lunch');
  const [menu, setMenu] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [mealId, setMealId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dietaryFulfilled, setDietaryFulfilled] = useState(true);
  const [dietaryExceptionReason, setDietaryExceptionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [restriction, setRestriction] = useState('');
  const [restrictionStart, setRestrictionStart] = useState(new Date().toISOString().slice(0, 10));
  const [restrictionEnd, setRestrictionEnd] = useState('');
  const [dietaryStudentId, setDietaryStudentId] = useState('');
  const [entitlementStudentId, setEntitlementStudentId] = useState('');
  const [entitlementPeriods, setEntitlementPeriods] = useState('breakfast, lunch, dinner');
  const [entitlementStart, setEntitlementStart] = useState(new Date().toISOString().slice(0, 10));
  const [entitlementEnd, setEntitlementEnd] = useState('');
  const [entitlementDietaryRef, setEntitlementDietaryRef] = useState('');
  const feedback = useOperationFeedback();
  const canManage = ['tenant_admin', 'principal', 'dining_officer'].includes(role);
  const refresh = useCallback(async () => {
    if (!authenticated) {
      setMeals([]);
      setEntitlements([]);
      setDietaryList([]);
      setLoadError('');
      return;
    }
    const [mealRes, entitlementRes] = await Promise.all([
      unifiedApiClient.requestLogistics<Envelope<Page<Meal>>>('/dining/meals?page=1&pageSize=100'),
      unifiedApiClient.requestLogistics<Envelope<typeof entitlements>>('/dining/entitlements').catch(() => ({ data: [] }))
    ]);
    setMeals(mealRes.data.data);
    setEntitlements(entitlementRes.data);
    setLoadError('');
  }, [authenticated]);
  useEffect(() => { void refresh().catch(reason => setLoadError(message(reason))); }, [refresh]);

  const submit = async (event: React.FormEvent, request: () => Promise<unknown>, success: string) => {
    event.preventDefault();
    await feedback.run(async () => { await request(); await refresh(); }, success);
  };
  return (
    <div className="space-y-4">
      {feedback.status}
      {loadError && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{loadError}</p>}
      <div className="grid gap-4 xl:grid-cols-3">
        {canManage && <OperationsPanel title="Schedule dining service">
          <form className="space-y-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/dining/meals', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                diningHall, serviceDate, servicePeriod, menu: menu.split('\n').map(item => item.trim()).filter(Boolean),
                startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString()
              })
            }), 'Meal schedule created.')}>
            <TextInput required label="Dining hall" value={diningHall} onChange={event => setDiningHall(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Service date" type="date" value={serviceDate} onChange={event => setServiceDate(event.target.value)} />
              <TextInput required label="Meal period" value={servicePeriod} onChange={event => setServicePeriod(event.target.value)} />
            </div>
            <label className="block text-xs font-semibold text-slate-300">Menu items
              <textarea value={menu} onChange={event => setMenu(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Starts at" type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} />
              <TextInput required label="Ends at" type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} />
            </div>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Schedule meal</button>
          </form>
        </OperationsPanel>}
        {canManage && <OperationsPanel title="Dietary restrictions and entitlements">
          <form className="space-y-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/dining/dietary-restrictions', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                studentId: dietaryStudentId, restriction, startsOn: restrictionStart,
                ...(restrictionEnd ? { endsOn: restrictionEnd } : {})
              })
            }), 'Dietary restriction recorded.')}>
            <TextInput required label="Student ID" value={dietaryStudentId} onChange={event => setDietaryStudentId(event.target.value)} />
            <label className="block text-xs font-semibold text-slate-300">Authorized restriction
              <textarea required value={restriction} onChange={event => setRestriction(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Starts on" type="date" value={restrictionStart} onChange={event => setRestrictionStart(event.target.value)} />
              <TextInput label="Ends on" type="date" value={restrictionEnd} onChange={event => setRestrictionEnd(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Save restriction</button>
              <button type="button" disabled={feedback.busy || !dietaryStudentId} onClick={() => void feedback.run(async () => {
                const res = await unifiedApiClient.requestLogistics<Envelope<typeof dietaryList>>(
                  `/dining/dietary-restrictions?studentId=${encodeURIComponent(dietaryStudentId)}`
                );
                setDietaryList(res.data);
              }, 'Dietary restrictions loaded.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Load student restrictions</button>
            </div>
          </form>
          {dietaryList.map(item => (
            <article key={item.id} className="flex items-center justify-between gap-2 rounded border border-slate-800 p-2 text-xs">
              <span>{item.restriction} ({item.startsOn})</span>
              {!item.revokedAt && <button type="button" disabled={feedback.busy} onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/dining/dietary-restrictions/${encodeURIComponent(item.id)}/revoke`, {
                  method: 'POST', headers: idempotencyHeaders()
                });
                setDietaryList(curr => curr.filter(row => row.id !== item.id));
              }, 'Dietary restriction revoked.')} className="rounded bg-rose-800 px-2 py-1 font-semibold">Revoke</button>}
            </article>
          ))}
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/dining/entitlements', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                studentId: entitlementStudentId,
                mealPeriods: entitlementPeriods.split(',').map(v => v.trim()).filter(Boolean),
                startsOn: entitlementStart,
                ...(entitlementEnd ? { endsOn: entitlementEnd } : {}),
                ...(entitlementDietaryRef ? { dietaryProfileReference: entitlementDietaryRef } : {})
              })
            }), 'Meal entitlement granted.')}>
            <h3 className="text-xs font-bold">Grant student meal entitlement</h3>
            <TextInput required label="Student ID" value={entitlementStudentId} onChange={event => setEntitlementStudentId(event.target.value)} />
            <TextInput required label="Meal periods (comma-separated)" value={entitlementPeriods} onChange={event => setEntitlementPeriods(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Starts on" type="date" value={entitlementStart} onChange={event => setEntitlementStart(event.target.value)} />
              <TextInput label="Ends on" type="date" value={entitlementEnd} onChange={event => setEntitlementEnd(event.target.value)} />
            </div>
            <TextInput label="Dietary reference (optional)" value={entitlementDietaryRef} onChange={event => setEntitlementDietaryRef(event.target.value)} />
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Grant entitlement</button>
          </form>
        </OperationsPanel>}
        <OperationsPanel title="Record meal attendance">
          <form className="space-y-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics(`/dining/meals/${encodeURIComponent(mealId)}/attendance`, {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                studentId, dietaryFulfilled,
                ...(dietaryExceptionReason ? { dietaryExceptionReason } : {}),
                ...(overrideReason ? { overrideReason } : {})
              })
            }), 'Meal attendance recorded.')}>
            <label className="block text-xs font-semibold text-slate-300">Scheduled meal
              <select required value={mealId} onChange={event => setMealId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a meal</option>
                {meals.map(meal => <option key={meal.id} value={meal.id}>{meal.diningHall} · {meal.servicePeriod} · {meal.serviceDate}</option>)}
              </select>
            </label>
            <TextInput required label="Student ID" value={studentId} onChange={event => setStudentId(event.target.value)} />
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={dietaryFulfilled} onChange={event => setDietaryFulfilled(event.target.checked)} /> Dietary requirements fulfilled</label>
            {!dietaryFulfilled && <TextInput required label="Authorized dietary exception reason" value={dietaryExceptionReason} onChange={event => setDietaryExceptionReason(event.target.value)} />}
            <TextInput label="Entitlement override reason (if authorized)" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} />
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Record attendance</button>
          </form>
        </OperationsPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <OperationsPanel title="Scheduled meals">
          {meals.length === 0 ? <p className="text-sm text-slate-400">No meal schedules are available.</p> : meals.map(meal => (
            <article key={meal.id} className="rounded-lg border border-slate-800 p-3 text-xs">
              <p className="font-semibold">{meal.diningHall} · {meal.servicePeriod} · {meal.serviceDate}</p>
              <p className="mt-1 text-slate-400">{meal.attendanceCount} served · {new Date(meal.startsAt).toLocaleTimeString()}–{new Date(meal.endsAt).toLocaleTimeString()}</p>
            </article>
          ))}
        </OperationsPanel>
        <OperationsPanel title="Student meal entitlements">
          {entitlements.length === 0 ? <p className="text-sm text-slate-400">No meal entitlements recorded.</p> : entitlements.map(item => (
            <article key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 text-xs">
              <div>
                <p className="font-semibold">Student {item.studentId}</p>
                <p className="mt-1 text-slate-400">{item.mealPeriods.join(', ')} · {item.startsOn} to {item.endsOn || 'ongoing'} · {item.status}</p>
              </div>
              {canManage && item.status === 'active' && (
                <button type="button" disabled={feedback.busy} onClick={() => void feedback.run(async () => {
                  await unifiedApiClient.requestLogistics(`/dining/entitlements/${encodeURIComponent(item.id)}/revoke`, {
                    method: 'POST', headers: idempotencyHeaders()
                  });
                  await refresh();
                }, 'Dining entitlement revoked.')} className="rounded bg-rose-800 px-2 py-1 font-semibold">Revoke</button>
              )}
            </article>
          ))}
        </OperationsPanel>
      </div>
    </div>
  );
}

export function TransportOperationsPanel({ authenticated, role }: { authenticated: boolean; role: string }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routeName, setRouteName] = useState('');
  const [routeStops, setRouteStops] = useState('');
  const [driverName, setDriverName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceValidUntil, setLicenceValidUntil] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [inspectionUntil, setInspectionUntil] = useState('');
  const [insuranceUntil, setInsuranceUntil] = useState('');
  const [routeId, setRouteId] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureAt, setDepartureAt] = useState('');
  const [arrivalAt, setArrivalAt] = useState('');
  const [assignmentTripId, setAssignmentTripId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [studentRoutes, setStudentRoutes] = useState<StudentRoute[]>([]);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [driverUpdateId, setDriverUpdateId] = useState('');
  const [driverUpdateValidUntil, setDriverUpdateValidUntil] = useState('');
  const [vehicleUpdateId, setVehicleUpdateId] = useState('');
  const [vehicleUpdateInspection, setVehicleUpdateInspection] = useState('');
  const [vehicleUpdateInsurance, setVehicleUpdateInsurance] = useState('');
  const [tripIncidents, setTripIncidents] = useState<Array<{ id: string; type: string; description: string; occurredAt: string }>>([]);
  const [subscriptionRouteId, setSubscriptionRouteId] = useState('');
  const [subscriptionStudentId, setSubscriptionStudentId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [subscriptionStartsOn, setSubscriptionStartsOn] = useState(new Date().toISOString().slice(0, 10));
  const [subscriptionEndsOn, setSubscriptionEndsOn] = useState('');
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState('');
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [maintenanceDueOn, setMaintenanceDueOn] = useState('');
  const [maintenanceItems, setMaintenanceItems] = useState<Array<{ id: string; description: string; dueOn: string; completedAt: string | null }>>([]);
  const [passengerTripId, setPassengerTripId] = useState('');
  const [passengerStudentId, setPassengerStudentId] = useState('');
  const [passengerEvent, setPassengerEvent] = useState<'boarded' | 'dropped_off'>('boarded');
  const [incidentType, setIncidentType] = useState<'missed_pickup' | 'incident'>('missed_pickup');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [tripPassengers, setTripPassengers] = useState<Array<{
    id: string; studentId: string; boardedAt: string | null; droppedOffAt: string | null;
  }>>([]);
  const [selectedManifestTripId, setSelectedManifestTripId] = useState('');
  const [loadError, setLoadError] = useState('');
  const feedback = useOperationFeedback();
  const canManage = ['tenant_admin', 'principal', 'transport_manager'].includes(role);
  const selectedSubscriptionRoute = routes.find(route => route.id === subscriptionRouteId);
  const refresh = useCallback(async () => {
    if (!authenticated) {
      setRoutes([]);
      setDrivers([]);
      setVehicles([]);
      setTrips([]);
      setTripIncidents([]);
      setStudentRoutes([]);
      setLoadError('');
      return;
    }
    const queryDate = encodeURIComponent(tripDate);
    const [routeResult, driverResult, vehicleResult, tripResult] = await Promise.all([
      unifiedApiClient.requestLogistics<Envelope<Route[]>>('/transport/routes'),
      unifiedApiClient.requestLogistics<Envelope<Driver[]>>('/transport/drivers'),
      unifiedApiClient.requestLogistics<Envelope<Vehicle[]>>('/transport/vehicles'),
      unifiedApiClient.requestLogistics<Envelope<Trip[]>>(`/transport/trips?tripDate=${queryDate}`)
    ]);
    setRoutes(routeResult.data);
    setDrivers(driverResult.data);
    setVehicles(vehicleResult.data);
    setTrips(tripResult.data);
    setLoadError('');
  }, [authenticated, tripDate]);
  useEffect(() => { void refresh().catch(reason => setLoadError(message(reason))); }, [refresh]);

  const submit = async (event: React.FormEvent, request: () => Promise<unknown>, success: string) => {
    event.preventDefault();
    await feedback.run(async () => { await request(); await refresh(); }, success);
  };
  return (
    <div className="space-y-4">
      {feedback.status}
      {loadError && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{loadError}</p>}
      {canManage && <div className="grid gap-4 xl:grid-cols-3">
        <OperationsPanel title="Routes and ordered stops">
          <form className="space-y-3" onSubmit={event => void submit(event, async () => {
            let stops: unknown;
            try { stops = JSON.parse(routeStops); } catch { throw new Error('Stops must be valid JSON, in route order.'); }
            if (!Array.isArray(stops)) throw new Error('Stops must be a JSON array.');
            return unifiedApiClient.requestLogistics('/transport/routes', {
              method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ name: routeName, stops })
            });
          }, 'Transport route created.')}>
            <TextInput required label="Route name" value={routeName} onChange={event => setRouteName(event.target.value)} />
            <label className="block text-xs font-semibold text-slate-300">Stops in travel order (JSON)
              <textarea required value={routeStops} onChange={event => setRouteStops(event.target.value)}
                placeholder={'[{"name":"Main Gate","latitude":6.52,"longitude":3.37,"geofenceRadiusMeters":150}]'}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs font-normal" />
            </label>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Create route</button>
          </form>
          {routes.map(route => <article key={route.id} className="rounded-lg border border-slate-800 p-3 text-xs">
            <p className="font-semibold">{route.name} · {route.status}</p>
            <p className="mt-1 text-slate-400">{route.stops.map(stop => `${stop.order}. ${stop.name}`).join(' → ')}</p>
            <code className="mt-1 block break-all text-[10px] text-slate-500">{route.id}</code>
          </article>)}
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/transport/student-routes', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                studentId: subscriptionStudentId, routeId: subscriptionRouteId, pickupStopId, dropoffStopId,
                startsOn: subscriptionStartsOn, ...(subscriptionEndsOn ? { endsOn: subscriptionEndsOn } : {})
              })
            }), 'Student route eligibility recorded.')}>
            <h3 className="text-xs font-bold">Student eligibility / subscription</h3>
            <TextInput required label="Student ID" value={subscriptionStudentId} onChange={event => setSubscriptionStudentId(event.target.value)} />
            <label className="block text-xs font-semibold text-slate-300">Route
              <select required value={subscriptionRouteId} onChange={event => {
                setSubscriptionRouteId(event.target.value); setPickupStopId(''); setDropoffStopId('');
              }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a route</option>{routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-300">Pickup stop
                <select required value={pickupStopId} onChange={event => setPickupStopId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Select stop</option>{selectedSubscriptionRoute?.stops.map(stop => <option key={stop.id} value={stop.id}>{stop.order}. {stop.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">Drop-off stop
                <select required value={dropoffStopId} onChange={event => setDropoffStopId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Select stop</option>{selectedSubscriptionRoute?.stops.map(stop => <option key={stop.id} value={stop.id}>{stop.order}. {stop.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Starts on" type="date" value={subscriptionStartsOn} onChange={event => setSubscriptionStartsOn(event.target.value)} />
              <TextInput label="Ends on" type="date" value={subscriptionEndsOn} onChange={event => setSubscriptionEndsOn(event.target.value)} />
            </div>
            <button disabled={feedback.busy || !routes.length} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Save student route</button>
          </form>
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <TextInput label="Student ID for eligibility history" value={subscriptionStudentId} onChange={event => setSubscriptionStudentId(event.target.value)} />
            <button type="button" disabled={feedback.busy || !subscriptionStudentId} onClick={() => void feedback.run(async () => {
              const response = await unifiedApiClient.requestLogistics<Envelope<StudentRoute[]>>(
                `/transport/student-routes?studentId=${encodeURIComponent(subscriptionStudentId)}`
              );
              setStudentRoutes(response.data);
            }, 'Student route history loaded.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Load student route history</button>
            <TextInput label="Subscription end date" type="date" value={subscriptionEndDate} onChange={event => setSubscriptionEndDate(event.target.value)} />
            {studentRoutes.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 p-2 text-xs">
              <span className="break-all">Route {item.routeId} · {item.startsOn}–{item.endsOn || 'ongoing'}</span>
              {!item.endsOn && <button type="button" disabled={feedback.busy} onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/transport/student-routes/${encodeURIComponent(item.id)}/end`, {
                  method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ endsOn: subscriptionEndDate })
                });
                setStudentRoutes(current => current.map(route => route.id === item.id ? { ...route, endsOn: subscriptionEndDate } : route));
              }, 'Student route eligibility ended.')} className="rounded bg-slate-800 px-2 py-1">End eligibility</button>}
            </article>)}
          </div>
        </OperationsPanel>
        <OperationsPanel title="Drivers and vehicles">
          <form className="space-y-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/transport/drivers', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({ fullName: driverName, licenceNumber, licenceValidUntil, qualified: true })
            }), 'Driver profile registered.')}>
            <TextInput required label="Driver full name" value={driverName} onChange={event => setDriverName(event.target.value)} />
            <TextInput required label="Driving licence number" value={licenceNumber} onChange={event => setLicenceNumber(event.target.value)} />
            <TextInput required label="Licence valid until" type="date" value={licenceValidUntil} onChange={event => setLicenceValidUntil(event.target.value)} />
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Register qualified driver</button>
          </form>
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/transport/vehicles', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({
                registration: vehicleRegistration, operatorType: 'school_owned', capacity: Number(vehicleCapacity),
                approved: true, inspectionValidUntil: inspectionUntil, insuranceValidUntil: insuranceUntil
              })
            }), 'Vehicle profile registered.')}>
            <TextInput required label="Vehicle registration" value={vehicleRegistration} onChange={event => setVehicleRegistration(event.target.value)} />
            <TextInput required label="Passenger capacity" type="number" min="1" value={vehicleCapacity} onChange={event => setVehicleCapacity(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Inspection valid until" type="date" value={inspectionUntil} onChange={event => setInspectionUntil(event.target.value)} />
              <TextInput required label="Insurance valid until" type="date" value={insuranceUntil} onChange={event => setInsuranceUntil(event.target.value)} />
            </div>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Register approved vehicle</button>
          </form>
          <div className="space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
            {drivers.map(driver => <p key={driver.id}>{driver.fullName} · licence to {driver.licenceValidUntil} · {driver.qualified ? 'qualified' : 'not qualified'} · {driver.status}</p>)}
            {vehicles.map(vehicle => <p key={vehicle.id}>{vehicle.registration} · capacity {vehicle.capacity} · {vehicle.status} · {vehicle.approved ? 'approved' : 'unapproved'}</p>)}
          </div>
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold">Driver qualification review</h3>
            <label className="block text-xs font-semibold text-slate-300">Driver
              <select value={driverUpdateId} onChange={event => setDriverUpdateId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a driver</option>{drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
              </select>
            </label>
            <TextInput label="Licence valid until" type="date" value={driverUpdateValidUntil} onChange={event => setDriverUpdateValidUntil(event.target.value)} />
            <button type="button" disabled={feedback.busy || !driverUpdateId || !driverUpdateValidUntil} onClick={() => void feedback.run(async () => {
              await unifiedApiClient.requestLogistics(`/transport/drivers/${encodeURIComponent(driverUpdateId)}/qualification`, {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ licenceValidUntil: driverUpdateValidUntil, qualified: true, status: 'active' })
              });
              await refresh();
            }, 'Driver qualification updated.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Confirm active qualification</button>
          </div>
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold">Vehicle compliance review</h3>
            <label className="block text-xs font-semibold text-slate-300">Vehicle
              <select value={vehicleUpdateId} onChange={event => setVehicleUpdateId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a vehicle</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <TextInput label="Inspection valid until" type="date" value={vehicleUpdateInspection} onChange={event => setVehicleUpdateInspection(event.target.value)} />
              <TextInput label="Insurance valid until" type="date" value={vehicleUpdateInsurance} onChange={event => setVehicleUpdateInsurance(event.target.value)} />
            </div>
            <button type="button" disabled={feedback.busy || !vehicleUpdateId || !vehicleUpdateInspection || !vehicleUpdateInsurance} onClick={() => void feedback.run(async () => {
              await unifiedApiClient.requestLogistics(`/transport/vehicles/${encodeURIComponent(vehicleUpdateId)}/compliance`, {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ inspectionValidUntil: vehicleUpdateInspection, insuranceValidUntil: vehicleUpdateInsurance, approved: true, status: 'active' })
              });
              await refresh();
            }, 'Vehicle compliance updated.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Confirm compliance and approval</button>
          </div>
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold">Preventative maintenance</h3>
            <label className="block text-xs font-semibold text-slate-300">Vehicle
              <select required value={maintenanceVehicleId} onChange={event => setMaintenanceVehicleId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a vehicle</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration}</option>)}
              </select>
            </label>
            <TextInput required label="Maintenance due on" type="date" value={maintenanceDueOn} onChange={event => setMaintenanceDueOn(event.target.value)} />
            <TextInput required label="Work description" value={maintenanceDescription} onChange={event => setMaintenanceDescription(event.target.value)} />
            <button type="button" disabled={feedback.busy || !maintenanceVehicleId} onClick={() => void feedback.run(async () => {
              const response = await unifiedApiClient.requestLogistics<Envelope<typeof maintenanceItems>>(
                `/transport/vehicles/${encodeURIComponent(maintenanceVehicleId)}/maintenance`
              );
              setMaintenanceItems(response.data);
            }, 'Maintenance schedule loaded.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Load maintenance</button>
            <button type="button" disabled={feedback.busy || !maintenanceVehicleId} onClick={() => void feedback.run(async () => {
              await unifiedApiClient.requestLogistics(`/transport/vehicles/${encodeURIComponent(maintenanceVehicleId)}/maintenance`, {
                method: 'POST', headers: idempotencyHeaders(),
                body: JSON.stringify({ description: maintenanceDescription, dueOn: maintenanceDueOn })
              });
              const response = await unifiedApiClient.requestLogistics<Envelope<typeof maintenanceItems>>(
                `/transport/vehicles/${encodeURIComponent(maintenanceVehicleId)}/maintenance`
              );
              setMaintenanceItems(response.data);
            }, 'Maintenance scheduled.')} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">
              Schedule maintenance
            </button>
            {maintenanceItems.map(item => <article key={item.id} className="flex items-center justify-between gap-2 rounded border border-slate-800 p-2 text-xs">
              <span>{item.description} · due {item.dueOn} · {item.completedAt ? 'completed' : 'open'}</span>
              {!item.completedAt && <button type="button" disabled={feedback.busy} onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/transport/maintenance/${encodeURIComponent(item.id)}/complete`, { method: 'POST', headers: idempotencyHeaders() });
                const response = await unifiedApiClient.requestLogistics<Envelope<typeof maintenanceItems>>(
                  `/transport/vehicles/${encodeURIComponent(maintenanceVehicleId)}/maintenance`
                );
                setMaintenanceItems(response.data);
              }, 'Maintenance marked complete.')} className="rounded bg-slate-800 px-2 py-1">Complete</button>}
            </article>)}
          </div>
        </OperationsPanel>
        <OperationsPanel title="Trips, assignment, and passenger events">
          <form className="space-y-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics('/transport/trips', {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({ routeId, tripDate, departureAt: new Date(departureAt).toISOString(), arrivalAt: new Date(arrivalAt).toISOString() })
            }), 'Trip scheduled.')}>
            <label className="block text-xs font-semibold text-slate-300">Route
              <select required value={routeId} onChange={event => setRouteId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a route</option>{routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
            </label>
            <TextInput required label="Trip date" type="date" value={tripDate} onChange={event => setTripDate(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput required label="Departure" type="datetime-local" value={departureAt} onChange={event => setDepartureAt(event.target.value)} />
              <TextInput required label="Arrival" type="datetime-local" value={arrivalAt} onChange={event => setArrivalAt(event.target.value)} />
            </div>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Schedule trip</button>
          </form>
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(assignmentTripId)}/assignment`, {
              method: 'PATCH', body: JSON.stringify({ driverId, vehicleId })
            }), 'Driver and vehicle assignment saved.')}>
            <label className="block text-xs font-semibold text-slate-300">Scheduled trip
              <select required value={assignmentTripId} onChange={event => setAssignmentTripId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a trip</option>{trips.map(trip => <option key={trip.id} value={trip.id}>{trip.id} · {trip.status}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-300">Qualified driver
              <select required value={driverId} onChange={event => setDriverId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a driver</option>{drivers.filter(driver => driver.qualified && driver.status === 'active').map(driver => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-300">Approved vehicle
              <select required value={vehicleId} onChange={event => setVehicleId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="">Select a vehicle</option>{vehicles.filter(vehicle => vehicle.approved && vehicle.status === 'active').map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.capacity} seats</option>)}
              </select>
            </label>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Assign driver and vehicle</button>
          </form>
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(passengerTripId)}/passenger-events`, {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({ studentId: passengerStudentId, eventType: passengerEvent })
            }), `Passenger ${passengerEvent === 'boarded' ? 'boarding' : 'drop-off'} recorded.`)}>
            <TextInput required label="Trip ID" value={passengerTripId} onChange={event => setPassengerTripId(event.target.value)} />
            <TextInput required label="Student ID" value={passengerStudentId} onChange={event => setPassengerStudentId(event.target.value)} />
            <label className="block text-xs font-semibold text-slate-300">Passenger event
              <select value={passengerEvent} onChange={event => setPassengerEvent(event.target.value as typeof passengerEvent)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="boarded">Boarded</option><option value="dropped_off">Dropped off</option>
              </select>
            </label>
            <button disabled={feedback.busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold disabled:opacity-50">Record passenger event</button>
          </form>
          <form className="space-y-3 border-t border-slate-800 pt-3" onSubmit={event => void submit(event, () =>
            unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(passengerTripId)}/incidents`, {
              method: 'POST', headers: idempotencyHeaders(),
              body: JSON.stringify({ type: incidentType, studentId: passengerStudentId || undefined, description: incidentDescription })
            }), 'Trip incident recorded.')}>
            <label className="block text-xs font-semibold text-slate-300">Incident type
              <select value={incidentType} onChange={event => setIncidentType(event.target.value as typeof incidentType)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option value="missed_pickup">Missed pickup</option><option value="incident">Other incident</option>
              </select>
            </label>
            <TextInput required label="Incident details" value={incidentDescription} onChange={event => setIncidentDescription(event.target.value)} />
            <button disabled={feedback.busy} className="rounded-lg bg-rose-800 px-3 py-2 text-xs font-bold disabled:opacity-50">Record incident</button>
          </form>
          <button type="button" disabled={feedback.busy || !passengerTripId} onClick={() => void feedback.run(async () => {
            const response = await unifiedApiClient.requestLogistics<Envelope<typeof tripIncidents>>(
              `/transport/trips/${encodeURIComponent(passengerTripId)}/incidents`
            );
            setTripIncidents(response.data);
          }, 'Trip incident history loaded.')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Load incident history</button>
          {tripIncidents.map(item => <article key={item.id} className="rounded border border-slate-800 p-2 text-xs">
            <p className="font-semibold">{item.type} · {new Date(item.occurredAt).toLocaleString()}</p><p className="text-slate-400">{item.description}</p>
          </article>)}
        </OperationsPanel>
      </div>}
      <OperationsPanel title="Scheduled trips">
        <TextInput label="Filter by service date" type="date" value={tripDate} onChange={event => setTripDate(event.target.value)} />
        {trips.length === 0 ? <p className="text-sm text-slate-400">No trips scheduled for this date.</p> : trips.map(trip => (
          <article key={trip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 p-3 text-xs">
            <span className="break-all">{trip.id} · {trip.status} · route {trip.routeId} · driver {trip.driverId || 'unassigned'} · vehicle {trip.vehicleId || 'unassigned'}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={feedback.busy} onClick={() => void feedback.run(async () => {
                const res = await unifiedApiClient.requestLogistics<Envelope<typeof tripPassengers>>(
                  `/transport/trips/${encodeURIComponent(trip.id)}/passengers`
                );
                setSelectedManifestTripId(trip.id);
                setTripPassengers(res.data);
              }, 'Trip passenger manifest loaded.')} className="rounded border border-slate-700 px-2 py-1">Passengers</button>
              {canManage && trip.status === 'vehicle_assigned' && <button type="button" onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(trip.id)}/start`, { method: 'POST', headers: idempotencyHeaders() });
                await refresh();
              }, 'Trip started.')} className="rounded bg-indigo-700 px-2 py-1 font-semibold">Start trip</button>}
              {canManage && ['scheduled', 'driver_assigned', 'vehicle_assigned'].includes(trip.status) && <button type="button" onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(trip.id)}/cancel`, {
                  method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ reason: 'Cancelled from operations schedule' })
                });
                await refresh();
              }, 'Trip cancelled.')} className="rounded bg-rose-800 px-2 py-1 font-semibold">Cancel trip</button>}
              {canManage && ['started', 'in_progress'].includes(trip.status) && <button type="button" onClick={() => void feedback.run(async () => {
                await unifiedApiClient.requestLogistics(`/transport/trips/${encodeURIComponent(trip.id)}/complete`, { method: 'POST', headers: idempotencyHeaders() });
                await refresh();
              }, 'Trip completed.')} className="rounded bg-emerald-700 px-2 py-1 font-semibold">Complete trip</button>}
            </div>
          </article>
        ))}
        {selectedManifestTripId && (
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold">Passenger manifest for trip {selectedManifestTripId}</h3>
            {tripPassengers.length === 0 ? (
              <p className="text-xs text-slate-400">No passenger boarding or drop-off events recorded yet.</p>
            ) : tripPassengers.map(pax => (
              <p key={pax.id} className="rounded border border-slate-800 p-2 text-xs">
                Student {pax.studentId} · Boarded: {pax.boardedAt ? new Date(pax.boardedAt).toLocaleString() : 'no'} · Dropped off: {pax.droppedOffAt ? new Date(pax.droppedOffAt).toLocaleString() : 'no'}
              </p>
            ))}
          </div>
        )}
      </OperationsPanel>
    </div>
  );
}
