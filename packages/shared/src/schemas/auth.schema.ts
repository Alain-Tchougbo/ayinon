import { z } from "zod";

export const ConnexionSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8),
});
export type ConnexionDto = z.infer<typeof ConnexionSchema>;
