"use client";

/**
 * Registration Stepper — imported from 21st.dev (ravikatiyar162/registration-stepper).
 * Vertical accordion rail: completed steps collapse to a check, the active
 * step expands its content with a spring. Adapted: w-full (not w-screen),
 * completed headers become buttons (jump back), a11y + focus attrs added.
 */
import * as React from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepProps {
  step: number;
  title: string;
  description: string;
  content: React.ReactNode;
}

interface RegistrationStepperProps {
  className?: string;
  steps: StepProps[];
  currentStep: number;
  headerTitle: string;
  headerStatus: string;
  onStepClick?: (index: number) => void;
}

const iconVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

const contentVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.4, ease: "easeInOut" },
  },
};

export const RegistrationStepper = ({
  className,
  steps,
  currentStep,
  headerTitle,
  headerStatus,
  onStepClick,
}: RegistrationStepperProps) => {
  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-none font-semibold tracking-tight">
              {headerTitle}
            </h3>
            <span className="rounded-full bg-success px-2 py-1 text-xs font-semibold text-success-foreground">
              {headerStatus}
            </span>
          </div>
        </div>

        <div className="p-6 pt-0">
          <ol className="space-y-2" aria-label="Registration steps">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <li key={step.title} className="overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="relative flex h-8 w-8 items-center justify-center">
                        <AnimatePresence>
                          {isCompleted ? (
                            <motion.div
                              key="check"
                              variants={iconVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                            >
                              <CheckCircle2
                                className="h-8 w-8 text-success-foreground"
                                aria-hidden
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="circle"
                              initial={{ scale: 1 }}
                              animate={{ scale: isActive ? 1.1 : 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Circle
                                className={cn(
                                  "h-8 w-8 text-muted-foreground",
                                  isActive && "text-primary",
                                )}
                                aria-hidden
                              />
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute text-sm font-semibold text-muted-foreground",
                                  "inset-0 flex items-center justify-center",
                                  isActive &&
                                    "m-1 h-6 w-6 rounded-full bg-primary text-primary-foreground",
                                )}
                              >
                                {stepNumber}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {index < steps.length - 1 ? (
                        <div aria-hidden className="mt-2 h-8 w-px bg-border" />
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <div
                        className="flex cursor-pointer items-center justify-between outline-none"
                        onClick={() => isCompleted && onStepClick?.(index)}
                        role={isCompleted ? "button" : undefined}
                        tabIndex={isCompleted ? 0 : isActive ? -1 : undefined}
                        onKeyDown={(e) => {
                          if (
                            isCompleted &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            onStepClick?.(index);
                          }
                        }}
                        aria-current={isActive ? "step" : undefined}
                        aria-label={`${step.title}${isCompleted ? " — done" : isActive ? " — current" : ""}`}
                      >
                        <div>
                          <h4
                            className={cn(
                              "font-medium",
                              isActive && "text-foreground",
                              isCompleted && "text-muted-foreground",
                            )}
                          >
                            {step.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                        <ChevronDown
                          aria-hidden
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isActive && "rotate-180",
                          )}
                        />
                      </div>

                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.div
                            key="content"
                            variants={contentVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            className="overflow-hidden"
                          >
                            <div className="pt-4">{step.content}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};
