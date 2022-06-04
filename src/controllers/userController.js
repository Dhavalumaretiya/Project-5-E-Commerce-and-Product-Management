const userModel = require("../models/userModel");
const awsConfig = require("../utils/aws");
const validator = require("../utils/validation")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//-------------------------------------Create User-------------------------------------------------------

const createUser = async function (req, res) {
    try {
        let requestBody = req.body;
        const saltRounds = 10;

        //Validation Start
        if (!validator.validRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request body. Please provide the the input to proceed" })
        }

        //Extract Params
        const { fname, lname, email, password, phone } = requestBody
        let fnames = /^[a-zA-Z ]{2,30}$/.test(fname)
        if (!fnames) {
            return res.status(400).send({ status: false, message: 'First Name is required in only characters' })
        };
        if (!validator.isValid(fname)) {
            return res.status(400).send({ status: false, message: 'First Name is required' })
        };
        let lnames = /^[a-zA-Z ]{2,30}$/.test(lname)
        if (!lnames) {
            return res.status(400).send({ status: false, message: 'Last Name is required in only characters' })
        }
        if (!validator.isValid(lname)) {
            return res.status(400).send({ status: false, message: 'Last Name is required' })
        }

        if (!validator.isValid(email)) {
            return res.status(400).send({ status: false, message: 'Email is required' })
        }
        //check for valid mail
        if (!email.match(/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/)) {
            return res.status(400).send({ status: false, message: 'Invalid Mail' })
        }
        //check for unique mail
        const isEmailAlreadyUsed = await userModel.findOne({ email })
        if (isEmailAlreadyUsed) {
            return res.status(400).send({ status: false, message: 'This email is already registered' })
        }

        if (!validator.isValid(password)) {
            return res.status(400).send({ status: false, message: 'Password is required' })
        }
        //check for password length
        if (!(password.trim().length >= 8 && password.length <= 15)) {
            return res.status(400).send({ status: false, message: 'Password should have length in range 8 to 15' })
        }
        // Bcrypt password
        requestBody.password = await bcrypt.hash(password, saltRounds)

        if (!validator.isValid(phone)) {
            return res.status(400).send({ status: false, message: 'Phone no is required' })
        }
        //check for unique phone no
        const isNoAlreadyUsed = await userModel.findOne({ phone })
        if (isNoAlreadyUsed) {
            return res.status(400).send({ status: false, message: 'This phone no is Already registered' })
        }
        //check for valid no
        if (!(/^[6-9]\d{9}$/.test(phone))) {
            return res.status(400).send({ status: false, message: 'Invalid phone no.' })
        }

        let shipping = requestBody.address.shipping

        if (!validator.isValid(shipping.street)) {
            return res.status(400).send({ status: false, message: 'Street is required' })
        }

        if (!validator.isValid(shipping.city)) {
            return res.status(400).send({ status: false, message: 'City is required' })
        }

        if (!validator.isValid(shipping.pincode)) {
            return res.status(400).send({ status: false, message: 'Pincode is required' })
        }

        let billing = requestBody.address.billing

        if (!validator.isValid(billing.street)) {
            return res.status(400).send({ status: false, message: 'Street is required' })
        }

        if (!validator.isValid(billing.city)) {
            return res.status(400).send({ status: false, message: 'City is required' })
        }

        if (!validator.isValid(billing.pincode)) {
            return res.status(400).send({ status: false, message: 'Pincode is required' })
        }
        //Validation End

        // Uplode image
        let files = req.files;

        if (!(files && files.length > 0))
            return res.status(400).send({ status: false, message: "No file found" });

        let uploadedFileURL = await awsConfig.uploadFile(files[0]);

        requestBody.profileImage = uploadedFileURL;


        const registerUser = await userModel.create(requestBody);

        res.status(201).send({ status: true, message: 'User created successfully', userId: registerUser });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}



//-------------------------------------User login--------------------------------------------------------

const loginUser = async function (req, res) {
    try {
        let requestBody = req.body;

        //Extract Params
        let { email, password } = requestBody

        if (!validator.validRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request body. Please provide the the input to proceed" })
        }
        //Validation start
        if (!validator.isValid(email)) {
            return res.status(400).send({ status: false, message: "Please enter an email address." })
        }

        if (!validator.isValid(password)) {
            return res.status(400).send({ status: false, message: "Please enter Password." })
        }

        let user = await userModel.findOne({ email });
        if (!user)
            return res.status(400).send({ status: false, message: "Login failed! Email  is incorrect." });

        let passwordInBody = user.password;
        let encryptPassword = await bcrypt.compare(password, passwordInBody);

        if (!encryptPassword) return res.status(400).send({ status: false, message: "Login failed! password is incorrect." });
        //Validation End

        let userId = user._id
        // create token
        let token = jwt.sign(
            {
                userId: user._id.toString(),
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 48 * 60 * 60
            },
            'project-5-Products_Management'
        )

        res.status(200).send({ status: true, message: 'Success', userId: { userId, token } });

    } catch (err) {
        res.status(500).send({ message: "Server not responding", error: err.message });
    }
};

//-------------------------------------get User profile----------------------------------------------------

const getUser = async function (req, res) {
    try {
        let userId = req.params.userId;
        if (!validator.vaildObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId" })
        }
        //getting the user document
        const user = await userModel.findOne({ _id: userId })
        return res.status(200).send({ status: true, message: 'User Profile Details', data: user })
    } catch (err) {
        res.status(500).send({ message: "Server not responding", error: err.message });
    }
};

//-------------------------------------update User profile----------------------------------------------------

const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId;

        //Id validatiom

        if (!validator.vaildObjectId(userId))
            return res.status(400).send({ status: false, message: "Not a valid user ID" });

        //Id verification

        let userDetails = await userModel.findById(userId);
        if (!userDetails)
            return res.status(404).send({ status: false, message: "User not found." });

        let data = req.body;

        //for update required filled can't be blank

        if (Object.keys(req.body).length == 0 && (!req.files))
            return res.status(400).send({ status: false, message: "NO INPUT BY USER" });

        let { fname, lname, email, phone, password, address } = data;

        //validation of fname
        if (fname === "") return res.status(400).send({ status: false, message: "fname can't be empty" })

        if (fname) {
            if (!validator.isValid(fname)) return res.status(400).send({ status: false, message: "first Name is not valid" });
        }

        //validation of lname
        if (lname === "") return res.status(400).send({ status: false, message: "lname can't be empty" })

        if (lname) {
            if (!validator.isValid(lname)) return res.status(400).send({ status: false, message: "last Name is not valid" });
        }

        //valiation of email
        if (email === "") return res.status(400).send({ status: false, message: "email can't be empty" })

        if (email) {
            if (!validator.isValid(email)) return res.status(400).send({ status: false, message: "email Id is not valid" });

            email = email.trim()
            if (!/^\w+([\.-]?\w+)@\w+([\. -]?\w+)(\.\w{2,3})+$/.test(email))
                return res.status(400).send({ status: false, message: "email ID is not valid" });

            let dupEmail = await userModel.findOne({ email: email });
            if (dupEmail) return res.status(400).send({ status: false, message: "email is already registered" });
        }

        //validation of phone
        if (phone === "") return res.status(400).send({ status: false, message: "phone can't be empty" })

        if (phone) {
            if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).send({ status: false, message: "phone number should be valid number", });

            let dupPhone = await userModel.findOne({ phone: phone });
            if (dupPhone) return res.status(400).send({ status: false, message: "phone is already registered" });
        }

        //validation of pasword
        if (password === "") return res.status(400).send({ status: false, message: "password can't be empty" })

        if (password) {
            if (password.length < 8 || password.length > 15) return res.status(400).send({ status: false, message: "Password length should be 8 to 15" });

            const saltRounds = 10
            var encryptedPassword = await bcrypt.hash(password, saltRounds);
        }

        //validation of shipping & billing address
        if (address) {
            if (typeof (address) == 'string') address = JSON.parse(address)
            if (address.shipping) {
                if (address.shipping.city) {
                    if (!validator.isValid(address.shipping.city)) return res.status(400).send({ status: false, message: 'shipping address city is not valid' })
                    var shippingCity = address.shipping.city;
                }
                if (address.shipping.street) {
                    if (!validator.isValid(address.shipping.street)) return res.status(400).send({ status: false, message: 'shipping address street is not valid' })
                    var shippingStreet = address.shipping.street;
                }
                if (address.shipping.pincode) {
                    if (!/^[1-9][0-9]{5}$/.test(address.shipping.pincode)) return res.status(400).send({ status: false, message: "Please enter valid Pincode for shipping", });
                    var shippingPincode = address.shipping.pincode;
                }

            }
            if (address.billing) {
                if (address.billing.city) {
                    if (!validator.isValid(address.billing.city)) return res.status(400).send({ status: false, message: 'billing address city is not valid' })
                    var billingCity = address.billing.city;
                }
                if (address.billing.street) {
                    if (!validator.isValid(address.billing.street)) return res.status(400).send({ status: false, message: 'billing address street is not valid' })
                    var billingStreet = address.billing.street;
                }
                if (address.billing.pincode) {
                    if (!/^[1-9][0-9]{5}$/.test(address.billing.pincode)) return res.status(400).send({ status: false, message: "Please enter valid Pincode for billing", });
                    var billingPincode = address.billing.pincode;
                }
            }
        }
        //upload profile image to s3 and get the uploaded link

        let files = req.files      // whatever the key is , doesnt matter
        if (files && files.length > 0) {
            var uploadedprofileImage = await uploadFile(files[0])
        }

        let updatedUser = await userModel.findOneAndUpdate(
            { _id: userId },
            {
                $set: {
                    fname, lname, email, phone, profileImage: uploadedprofileImage, password: encryptedPassword,
                    "address.shipping.city": shippingCity,
                    "address.shipping.street": shippingStreet,
                    "address.shipping.pincode": shippingPincode,
                    "address.billing.city": billingCity,
                    "address.billing.street": billingStreet,
                    "address.billing.pincode": billingPincode,
                    updatedAt: Date.now()
                }
            },
            { new: true }
        );
        return res.status(200).send({ status: true, message: "User profile updated", data: updatedUser });

    } catch (err) {
        res.status(500).send({ message: "Server not responding", error: err.message });
    }
};

// -----------------------------------Exports----------------------------------------------
module.exports = { createUser, loginUser, getUser, updateUser }