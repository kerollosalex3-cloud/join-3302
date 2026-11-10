import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";

const greetingName = document.querySelector("#greeting-name");
const avatarInitials = document.querySelector(".header-avatar-initials");
const mobileAvatarInitials = document.querySelector(".summary-mobile-avatar");
const avatarTrigger = document.querySelector(".header-avatar-trigger");

function getUserName(user) {
    if (user.isAnonymous) return "Guest";

    return user.displayName?.trim() || "User";
}

async function getDatabaseUserName(user) {
    const snapshot = await get(ref(db, userPath(user.uid)));
    const databaseName = snapshot.child("name").val();

    if (typeof databaseName !== "string" || !databaseName.trim()) {
        throw new Error(`No name found for Firebase user ${user.uid}.`);
    }

    return databaseName.trim();
}

function getInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase();
    }

    return parts[0]?.slice(0, 2).toLocaleUpperCase() || "G";
}

onAuthStateChanged(auth, async (user) => {
    let name = user ? getUserName(user) : "Guest";

    if (user && !user.isAnonymous) {
        try {
            name = await getDatabaseUserName(user);
        } catch (error) {
            console.error("Could not load the signed-in user's name from Firebase:", error);
            name = user.displayName?.trim() || "Name unavailable";
        }
    }

    if (user && auth.currentUser?.uid !== user.uid) return;

    const initials = !user || user.isAnonymous ? "G" : getInitials(name);

    greetingName.textContent = name;
    avatarInitials.textContent = initials;
    mobileAvatarInitials.textContent = initials;
    avatarTrigger.setAttribute("aria-label", `Open profile menu for ${name}`);
});
