# express-route-validation

Ensure your Express routes are always receiving and returning the correct data with this express validation middleware. Seamlessly validate request and response objects, catching any instances where your route is returning unwanted data. Effortlessly handle bad request responses and integrate with popular validation libraries like Zod or Joi

## Examples

### Joi

Configure the route validator:
```ts
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
```

Use the route validator middleware in your router:
```ts
app.get('/users/:id', routeValidator({
    response: { 200: Joi.object({ name: Joi.string() }) },
    request: { params: Joi.object({ id: Joi.string().uuid() }) },
    route: (req, res, next) => {
        const user = getUserById(req.params.id)
        res.json(user)
    }
}))
```

### Zod
Configure the route validator:
```ts
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
```

Use the route validator middleware in your router:
```ts
app.get('/users/:id', routeValidator({
    response: { 200: z.object({ name: z.string() }) },
    request: { params: z.object({ id: z.string().uuid() }) },
    route: (req, res, next) => {
        const user = getUserById(req.params.id)
        res.json(user)
    }
}))
```