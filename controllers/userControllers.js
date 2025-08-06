import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const saltRound = 12;

const Signup = async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const hashedPass = await bcrypt.hash(password, saltRound);
    const query = `Insert into users (email,username,password) values (?,?,?) `;
    const values = [email, username, hashedPass];

    const [result] = await req.server.mysql.query(query, values);

    const token = jwt.sign(
      { id: result.insertId, email, username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res
      .code(201)
      .setCookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        success: true,
        message: "User registered Successfully",
        user: { id: result.insertId, email, username },
      });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await req.server.mysql.query(
      "Select * from users where email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .send({ success: false, message: "Invalid email or password" });
    }
    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .send({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res
      .code(200)
      .setCookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        success: true,
        message: "Login Succesfull",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const Logout = (req, res) => {
  res
    .clearCookie("token", {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
    })
    .send({
      success: true,
      message: "Logged out successfully",
    });
};

const Profile = async (req, res) => {
  try {
    const user = req.user;
    res.send({
      success: true,
      message: "Profile Page fetched",
      user,
    });
  } catch (error) {
    res.code(500).send({ success: false, message: error.message });
  }
};

const ProfileUpdate = async (req, res) => {
  try {
    console.log(req.user);
    const { email, username } = req.body;
    let userId = req.user.id;
    console.log(req.user.id);
    await req.server.mysql.query(
      "update users set username=? , email=? where id=?",
      [username, email, userId]
    );
    res.code(200).send({ success: true, message: "Update Hogaya!" });
    console.log("Updates user");
  } catch (error) {
    res.code(500).send({ success: false, message: error.message });
  }
};

const PasswordUpdate = async (req, res) => {
  try {
    const { currPassword, newPassword } = req.body;

    // get the user
    const [rows] = await req.server.mysql.query(
      "SELECT password FROM users WHERE id = ?",
      [req.user.id]
    );
    const user = rows[0];
    if (!user) {
      return res.code(404).send({ success: false, message: "User not found" });
    }

    // Compare current password;
    const match = await bcrypt.compare(currPassword, user.password);
    if (!match) {
      return res
        .code(401)
        .send({ success: false, message: "Invalid Password" });
    }

    //Hash new Password
    const hashNewPass = await bcrypt.hash(newPassword, saltRound);

    await req.server.mysql.query("Update users set password= ? where id=?", [
      hashNewPass,
      req.user.id,
    ]);

    res.send({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
};

export { Signup, Login, Logout, Profile, ProfileUpdate, PasswordUpdate };
