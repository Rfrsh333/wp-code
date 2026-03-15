// Medewerker Portal Animation Constants
// Spring configs for framer-motion

export const springGentle = {
  type: "spring" as const,
  stiffness: 120,
  damping: 20,
  mass: 1,
};

export const springSnappy = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export const springBouncy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 15,
  mass: 0.5,
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
};

export const cardHover = {
  whileHover: { scale: 1.02, y: -2 },
  whileTap: { scale: 0.98 },
  transition: springSnappy,
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
};

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const staggerChild = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};
