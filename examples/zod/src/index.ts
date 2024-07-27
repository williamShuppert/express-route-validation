import express from 'express'
import validationConfig, { routeValidator } from 'express-route-validator'
import { z, ZodSchema, ZodError } from 'zod'

// Call this function to configure the route validator
validationConfig<ZodSchema, ZodError>({
    validator(data, schema) {
        try {
            const parse = schema.parse(data)
            return { success: true, data: parse }
        } catch (err) {
            return { success: false, error: err }
        }
    },
    badRequestHandler(errs, req, res, next) {
        res.status(400).json({
            message: "Bad Request",
            errors: errs.map(d => d.error.errors.map(e => ({ // Reformat errors to liking
                path: `${d.location}.${e.path.join('.')}`,
                message: e.message
            }))).flat()
        })
    },
    badResponseHandler(errors, req, res, next) {
        res.status(500).json({ message: "Invalid Server Response" })
    },
    missingResponseSchemaHandler(error, req, res, next) {
        res.status(500).json({ message: error.message })
    },
})

const PORT = 3000
const app = express()

// The following shows how you would check the params for a uuid
app.get('/test/:id', routeValidator({
    response: { 200: z.literal('OK') },
    request: { params: z.object({ id: z.string().uuid() }) },
    route: (req, res, next) => {
        res.sendStatus(200)
    }
}))

// Here a string is returned for status code 200 when a number is expected.
// This will be handled by badResponseHandler if set, otherwise it will be
// sent to an express error handler.
app.get('/invalid-response', routeValidator({
    response: { 200: z.number() },
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