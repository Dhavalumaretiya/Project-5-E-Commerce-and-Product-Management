const productModel = require("../models/productModel");
const awsConfig = require("../utils/aws");
const validator = require("../utils/validation");

//---------------------------------------------Create product-----------------------------------------------------
const createProduct = async function (req, res) {
    try {
        const requestBody = req.body
        //Validation Start
        if (!validator.validRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Body Data is required' })
        }

        //Extract params
        const { title, description, price, currencyId, currencyFormat, availableSizes } = requestBody

        if (!validator.isValid(title)) {
            return res.status(400).send({ status: false, message: 'Title is required' })
        }
        //Check for unique title
        const isTitleAlreadyExist = await productModel.findOne({ title })
        if (isTitleAlreadyExist) {
            return res.status(400).send({ status: false, message: 'This Title is already Exist' })
        }

        if (!validator.isValid(description)) {
            return res.status(400).send({ status: false, message: 'Description is required' })
        }

        if (!validator.isValid(price)) {
            return res.status(400).send({ status: false, message: 'Price is required' })
        }
        // Check for valid number/decimal
        if (!(/^\d{0,8}[.]?\d{1,4}$/.test(price))) {
            return res.status(400).send({ status: false, message: 'Invalid price' })
        }

        if (!validator.isValid(currencyId)) {
            return res.status(400).send({ status: false, message: 'CurrencyId is required' })
        }
        //Check for INR
        if (currencyId !== "INR") {
            return res.status(400).send({ status: false, message: 'only accepted INR' })
        }

        if (!validator.isValid(currencyFormat)) {
            return res.status(400).send({ status: false, message: 'CurrencyFormat is required' })
        }
        //check for symbol 
        if (currencyFormat !== "₹") {
            return res.status(400).send({ status: false, message: 'Only accepted ₹ this currency symbol' })
        }

        if (!validator.isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: 'AvailableSizes is required' })
        }
        //check for enum ["S", "XS", "M", "X", "L", "XXL", "XL"]
        if (availableSizes) {
            let array = availableSizes.split(",").map(x => x.toUpperCase().trim())
            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: 'Sizes only available from ["S", "XS", "M", "X", "L", "XXL", "XL"]' })
                }
            }
            if (Array.isArray(array)) {
                requestBody.availableSizes = array
            }
        }

        //File-cloud Data for storing image
        let files = req.files

        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "No file found" });
        }

        let uploadedFileURL = await awsConfig.uploadFile(files[0]);

        requestBody.productImage = uploadedFileURL;

        const product = await productModel.create(requestBody)
        res.status(201).send({ status: true, message: 'Product created successfullt', data: product })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

//--------------------------------------------Get Products by query-----------------------------------------------------

const getProductsByQuery = async function (req, res) {
    try {
        const filterQuery = { isDeleted: false } //complete object details.
        const queryParams = req.query;
        
        // validation start
        if (validator.validRequestBody(queryParams)) {
            let { size, name, priceGreaterThan, priceLessThan, priceSort } = queryParams;

            if (validator.isValid(size)) {
                filterQuery['availableSizes'] = size
            }
    
            if (validator.isValid(name)) {
                filterQuery['title'] = {}
                filterQuery['title']['$regex'] = name
                filterQuery['title']['$options'] = 'i'
            }

            //setting price for ranging the product's price to fetch them.
            if (validator.isValid(priceGreaterThan)) {

                if (!(!isNaN(Number(priceGreaterThan)))) {  ``
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (priceGreaterThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (!filterQuery.hasOwnProperty('price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$gte'] = Number(priceGreaterThan) 
                //console.log(typeof Number(priceGreaterThan))
            }

            //setting price for ranging the product's price to fetch them.
            if (validator.isValid(priceLessThan)) {

                if (!(!isNaN(Number(priceLessThan)))) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (!filterQuery.hasOwnProperty('price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$lte'] = Number(priceLessThan)
                //console.log(typeof Number(priceLessThan))
            }

            //sorting the products acc. to prices => 1 for ascending & -1 for descending.
            if (validator.isValid(priceSort)) {

                if (!((priceSort == 1) || (priceSort == -1))) {
                    return res.status(400).send({ status: false, message: `priceSort should be 1 or -1 ` })
                }

                const products = await productModel.find(filterQuery).sort({ price: priceSort })
                // console.log(products)
                if (Array.isArray(products) && products.length === 0) {
                    return res.status(404).send({ productStatus: false, message: 'No Product found' })
                }

                return res.status(200).send({ status: true, message: 'Product list', data2: products })
            }
        }

        const products = await productModel.find(filterQuery)

        //verifying is it an array and having some data in that array.
        if (Array.isArray(products) && products.length === 0) {
            return res.status(404).send({ productStatus: false, message: 'No Product found' })
        }

        return res.status(200).send({ status: true, message: 'Product list', data: products })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

//---------------------------------------------Get Products by Id-----------------------------------------------------
const getProductById = async function (req, res) {
    try {
        const paramsId = req.params.productId;

        if (!validator.vaildObjectId(paramsId)) {
            return res.status(400).send({ status: false, message: 'Params Id is invalid' })
        }

        const product = await productModel.findById(paramsId);

        if (!product) {
            return res.status(400).send({ status: false, message: 'Product not found' })
        }

        if (product.isDeleted) {
            return res.status(400).send({ status: false, message: 'This Product is deleted' })
        }

        res.status(200).send({ status: true, message: 'Success', data: product })

    } catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, Error: err.message })
    }
};

//---------------------------------------------Update product----------------------------------------------------
const updateProduct = async function (req, res) {
    try {
        const paramsId = req.params.productId;

        if (!validator.vaildObjectId(paramsId)) {
            return res.status(400).send({ status: false, message: 'Params Id is invalid' })
        }

        let findProduct = await productModel.findOne({ _id: paramsId, isDeleted: false });

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'Product not Exist' });
        }

        let requestBody = req.body;

        if (req.files.length) {
            let files = req.files;
            let uploadedFileURL = await awsConfig.uploadFile(files[0]);
            requestBody.productImage = uploadedFileURL;
        }

        if (!validator.validRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Please enter atleast one key for updation" })
        }

        const { title, description, price, currencyId, currencyFormat, availableSizes } = requestBody

        if (title) {
            if (!isValid(title)) {
                return res.status(400).send({ status: false, message: 'Title is required' })
            }
            //Check for unique title
            const isTitleAlreadyExist = await productModel.findOne({ title })
            if (isTitleAlreadyExist) {
                return res.status(400).send({ status: false, message: 'This Title is already Exist' })
            }
        }

        if (description) {
            if (!isValid(description)) {
                return res.status(400).send({ status: false, message: 'Description is required' })
            }
        }

        if (price) {
            if (!isValid(price)) {
                return res.status(400).send({ status: false, message: 'Price is required' })
            }
            //Check for valid number/decimal
            if (!(/^\d{0,8}[.]?\d{1,4}$/.test(price))) {
                return res.status(400).send({ status: false, message: 'Invalid price' })
            }
        }

        if (currencyId) {
            if (!isValid(currencyId)) {
                return res.status(400).send({ status: false, message: 'CurrencyId is required' })
            }
            //Check for INR
            if (currencyId !== "INR") {
                return res.status(400).send({ status: false, message: 'only accepted INR' })
            }
        }

        if (currencyFormat) {
            if (!isValid(currencyFormat)) {
                return res.status(400).send({ status: false, message: 'CurrencyFormat is required' })
            }
            //check for symbol ->
            if (currencyFormat !== "₹") {
                return res.status(400).send({ status: false, message: 'Only accepted ₹ this currency symbol' })
            }
        }

        if (availableSizes) {
            if (!isValid(availableSizes)) {
                return res.status(400).send({ status: false, message: 'AvailableSizes is required' })
            }
            let array = availableSizes.split(",").map(x => x.toUpperCase().trim())
            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: 'Sizes only available from ["S", "XS", "M", "X", "L", "XXL", "XL"]' })
                }
            }
            if (Array.isArray(array)) {
                requestBody.availableSizes = array
            }
        }

        let updateData = await productModel.findOneAndUpdate({ _id:findProduct }, requestBody, { new: true })

        res.status(200).send({ status: true, message: 'Product Updated Successfully', data: updateData })
    }
    catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, Error: err.message })
    }
};

//--------------------------------------------Delete product-------------------------------------------------------
const deleteProduct = async function (req,res){
    try{
        productId = req.params.productId;

        if (!validator.validRequestBody(productId)) 
        return res.status(400).send({ status: false, message: "Please enter atleast one key for updation" })

        if (!validator.vaildObjectId(productId)) 
        return res.status(400).send({ status: false, message: "Invalid product Id." })

        const getproduct = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!getproduct) 
        return res.status(404).send({ status: false, message: "No document found or it maybe deleted" })

        const deleteProduct = await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: Date.now()} }, { new: true })

        return res.status(200).send({ status: true, message: "successfully deleted", data: deleteProduct })
    }
    catch(err){
        res.status(500).send({status:false, Message: err.message})
    }
};

// -----------------------------------------Exports----------------------------------------------------------------
module.exports = { createProduct, getProductsByQuery, getProductById, updateProduct,deleteProduct }



