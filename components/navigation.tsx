"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartSheet } from "@/components/cart-sheet"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const pathname = usePathname()

  // Only use transparent nav on homepage
  const isHomePage = pathname === "/"
  const isMenuPage = pathname === "/menu"

  useEffect(() => {
    const handleScroll = () => {
      // Only transparent when at the very top
      setIsAtTop(window.scrollY < 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage && isAtTop ? "bg-transparent" : "bg-background/95 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-28">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <img
              src={isHomePage && isAtTop ? "/logoWhite.png" : "/logoBlack.png"}
              alt="Sunville Bakery"
              className="h-20 w-auto transition-all duration-300"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="/"
              className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent ${
                isHomePage && isAtTop ? "text-white" : "text-foreground"
              }`}
            >
              Home
            </a>
            <a
              href="/#about"
              className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent ${
                isHomePage && isAtTop ? "text-white" : "text-foreground"
              }`}
            >
              About
            </a>
            <a
              href="/menu"
              className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent ${
                isHomePage && isAtTop ? "text-white" : "text-foreground"
              }`}
            >
              Menu
            </a>
            <a
              href="/gallery"
              className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent ${
                isHomePage && isAtTop ? "text-white" : "text-foreground"
              }`}
            >
              Gallery
            </a>
            <a
              href="/contact"
              className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent ${
                isHomePage && isAtTop ? "text-white" : "text-foreground"
              }`}
            >
              Contact
            </a>
            {!isMenuPage && (
              <a
                href="/menu"
                className={`transition-all duration-200 font-semibold text-xl hover:scale-110 hover:text-accent underline underline-offset-4 ${
                  isHomePage && isAtTop ? "text-white" : "text-foreground"
                }`}
              >
                Order Now
              </a>
            )}
            <div className={isHomePage && isAtTop ? "text-white" : "text-foreground"}>
              <CartSheet />
            </div>
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="md:hidden flex items-center gap-2">
            <div className={isHomePage && isAtTop ? "text-white" : "text-foreground"}>
              <CartSheet />
            </div>
            <button
              className={`p-2 rounded-lg transition-all ${
                isMobileMenuOpen
                  ? "bg-accent text-accent-foreground"
                  : isHomePage && isAtTop
                    ? "text-white hover:bg-white/10"
                    : "text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-border bg-background/95 backdrop-blur-md">
            <div className="flex flex-col gap-2">
              <a
                href="/"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="/#about"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <a
                href="/menu"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Menu
              </a>
              <a
                href="/gallery"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Gallery
              </a>
              <a
                href="/contact"
                className="text-center text-foreground hover:bg-accent/10 hover:text-accent transition-all font-semibold text-lg py-3 px-4 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
