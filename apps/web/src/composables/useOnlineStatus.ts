import { onMounted, onUnmounted, ref } from "vue";

export function useOnlineStatus() {
  const enLigne = ref(navigator.onLine);

  function majEnLigne() {
    enLigne.value = navigator.onLine;
  }

  onMounted(() => {
    window.addEventListener("online", majEnLigne);
    window.addEventListener("offline", majEnLigne);
  });
  onUnmounted(() => {
    window.removeEventListener("online", majEnLigne);
    window.removeEventListener("offline", majEnLigne);
  });

  return { enLigne };
}
