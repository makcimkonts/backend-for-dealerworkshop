const db = require("../config/db.js");

class User {
  static async createUser(login, password, firstName, lastName, vinCode, role = "user") {
    const [result] = await db.execute(
      "INSERT INTO users (login, password, first_name, last_name, vin_code, role) VALUES (?, ?, ?, ?, ?, ?)",
      [login, password, firstName, lastName, vinCode, role]
    );
    return result;
  }

  static async findByLogin(login) {
    const [rows] = await db.execute("SELECT * FROM users WHERE login = ?", [login]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  }
  static async updateRole(userId, newRole) {
    try {
        const [result] = await db.execute(
            "UPDATE users SET role = ? WHERE id = ?", [newRole, userId]
        );
        console.log("Result of updateRole query:", result); // Log result of query
        return result;  // Ensure you're returning something that indicates success
    } catch (error) {
        throw new Error("Error updating user role: " + error.message);
    }
  }

}

module.exports = User;


  
