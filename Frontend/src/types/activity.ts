export type Account = {
  id: string;
  name: string;
};

export type Workspace = {
  organization: { id: string; name: string };
  user: { email: string; displayName: string };
  accounts: Account[];
};

export type ActivityEntry = {
  id: string;
  accountId: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: string;
};

export type ActivityResponse = {
  activities: ActivityEntry[];
};

export type CreateNoteResponse = {
  activity: ActivityEntry;
  wasDuplicate: boolean;
};

