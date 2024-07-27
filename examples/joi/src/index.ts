import express from 'express'
import validationConfig, { routeValidator } from 'express-route-validator'
import Joi from 'joi'

// Call this function to configure the route validator
validationConfig<Joi.ObjectSchema<any>, Joi.ValidationError>({
    validator(data, schema) {
        const parse = schema.validate(data)
        if (parse.error)
            return { success: false, error: parse.error }
        return { success: true, data: parse.value }
    },
    badRequestHandler(errs, req, res) {
        res.status(400).json({
            message: "Bad Request",
            errors: errs.map(r => r.error.details.map(d => ({ // Reformat errors to liking
                location: `${r.location}.${d.path.join('.')}`,
                message: d.message
            }))).flat()
        })
    },
    badResponseHandler(errors, req, res) {
        res.status(500).json({ message: "Invalid Server Response" })
    },
    missingResponseSchemaHandler(error, req, res) {
        res.status(500).json({ message: error.message })
    },
})

const PORT = 3000
const app = express()

// The following shows how you would check the params for a uuid
app.get('/test/:id', routeValidator({
    response: { 200: Joi.string() },
    request: { params: Joi.object({ id: Joi.string().uuid() }) },
    route: (req, res, next) => {
        res.sendStatus(200)
    }
}))

// Here a string is returned for status code 200 when a number is expected.
// This will be handled by badResponseHandler if set, otherwise it will be
// sent to an express error handler.
app.get('/invalid-response', routeValidator({
    response: { 200: Joi.number() },
    route: (req, res) => {
        res.send("You were expecting a number, but here is a string")
    }
}))

// The following shows that any async errors that occur in the route are
// automatically caught and sent to an express error handler
app.get('/error', routeValidator({
    response: {},
    route: async () => {
        throw new Error("Error in async function")
    }
}))

// Add an express error handler
app.use((err, req, res, next) => {
    res.sendStatus(500)
})

// Start the express app
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})