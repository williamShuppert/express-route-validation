export const db = {
  users: {
    serial: 1,
    insert: (username: string, password: string) => {
      const isUnique = !db.users.data.find((user) => user.username == username);
      if (!isUnique) return false;

      const user = {
        id: ++db.users.serial,
        username,
        password,
      };
      db.users.data.push(user);
      return user;
    },
    getById: (id: number) =>
      db.users.data.find((user) => user.id == id) ?? false,
    delete: (id: number) =>
      (db.users.data = db.users.data.filter((user) => user.id != id)),
    data: [
      {
        id: 1,
        username: "user",
        password: "pass",
      },
    ],
  },
};
