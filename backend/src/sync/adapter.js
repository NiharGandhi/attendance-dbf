export class SyncAdapter {
  async pushAttendance(records) {
    console.log("[sync] pushAttendance", { count: records.length });
    return { pushed: records.length };
  }

  async pullSessions() {
    console.log("[sync] pullSessions");
    return [];
  }
}
