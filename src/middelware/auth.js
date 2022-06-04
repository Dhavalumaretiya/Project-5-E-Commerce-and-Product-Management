const userModel = require("../models/userModel");
const validator = require("../utils/validation");
const jwt = require("jsonwebtoken");

// ---------------------------------------Authentication------------------------------------------------------------------
const authentication = function (req, res, next) {
    try {
        let bearerHeader = req.headers.authorization;

        if (typeof bearerHeader == "undefined") return res.status(400).send({ status: false, message: "Token is missing, please enter a token" });

        let bearerToken = bearerHeader.split(' ');

        let token = bearerToken[1];

        jwt.verify(token, "project-5-Products_Management", function (err, data) {
            if (err) {
                return res.status(400).send({ status: false, message: "Token is invalid" })
            }
           else {
                req.decodedToken = data;
                next()
            }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// ----------------------------------------Authorization-------------------------------------------------------------
const authorization = async (req, res, next) => {
    try {
        let userId = req.params.userId;
        let userIdfromToken = req.decodedToken.userId;

        if (!validator.vaildObjectId(userId))
            return res.status(400).send({ status: false, message: "Please enter vaild User id in params." });

        // if(!userId) return res.status(400).send({ status: false, message: "User-id is required" })

        let findUser = await userModel.findOne({ _id: userId })
        if (!findUser) {
            return res.status(400).send({ status: false, message: "User not found." });
        }

        if (findUser._id.toString() !== userIdfromToken) {
            res.status(401).send({ status: false, message: "Unauthorized access!!" });
        }

        next();
    } catch (err) {
        res.status(500).send({ status: false, error: err.message });
    }
};

// ---------------------------------------Exports----------------------------------------------------------
module.exports = { authentication, authorization }

