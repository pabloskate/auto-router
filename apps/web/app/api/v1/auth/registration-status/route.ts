import { resolveRegistrationMode, isFirstUser } from "@/src/lib/auth";
import { json, getRuntimeBindings } from "@/src/lib/infra";

export async function GET(): Promise<Response> {
    const bindings = getRuntimeBindings();
    const mode = resolveRegistrationMode(bindings.REGISTRATION_MODE);

    let signupAllowed = mode === "open";
    let firstUser = false;

    if (bindings.ROUTER_DB) {
        firstUser = await isFirstUser(bindings.ROUTER_DB);
        if (firstUser) signupAllowed = true;
        else if (mode === "invite") signupAllowed = true; // allowed with code
    }

    return json({
        mode,
        signupAllowed,
        firstUser,
        requiresInviteCode: mode === "invite" && !firstUser,
    });
}
