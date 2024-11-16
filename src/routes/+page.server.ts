import { z } from 'zod';
import { zod } from "sveltekit-superforms/adapters";
import { superValidate } from 'sveltekit-superforms/server';
import { fail, redirect } from '@sveltejs/kit';

const promptSchema = z.object({
    prompt: z.string().min(5, "What's on your mind?")
});

export const load = async () => {
    const promptForm = await superValidate(zod(promptSchema));
    return { promptForm };
};

export const actions = {
    default: async ({ request }: { request: Request }) => {

        const form = await superValidate(request, zod(promptSchema));
        // if (!form.valid) return fail(400, { promptForm: form });

        // Redirect to search with the prompt
        throw redirect(303, `/search?prompt=${encodeURIComponent(form.data.prompt)}`);
    }
};
